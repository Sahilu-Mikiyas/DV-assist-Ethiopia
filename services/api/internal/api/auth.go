package api

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/tls"
	"database/sql"
	"encoding/base32"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/mail"
	"net/netip"
	"net/smtp"
	"net/url"
	"strings"
	"sync"
	"time"
)

type rateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateEntry
}

type rateEntry struct {
	started time.Time
	count   int
}

func newRateLimiter() *rateLimiter { return &rateLimiter{entries: map[string]rateEntry{}} }

func (l *rateLimiter) allow(key string, maximum int, window time.Duration) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.entries) > 4096 {
		for candidate, entry := range l.entries {
			if now.Sub(entry.started) > window*2 {
				delete(l.entries, candidate)
			}
		}
	}
	entry := l.entries[key]
	if entry.started.IsZero() || now.Sub(entry.started) >= window {
		l.entries[key] = rateEntry{started: now, count: 1}
		return true
	}
	if entry.count >= maximum {
		return false
	}
	entry.count++
	l.entries[key] = entry
	return true
}

func (s *Server) requestChallenge(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	var request struct {
		Email string `json:"email"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	email, normalized, ok := normalizeEmail(request.Email)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_email", "Enter a valid email address.")
		return
	}
	allowed, err := s.allowRateLimit(r.Context(), s.limitKey("ip", s.clientIP(r)), 8, 15*time.Minute)
	if err != nil {
		s.logger.Error("apply auth challenge rate limit", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusServiceUnavailable, "request_unavailable", "Sign-in is temporarily unavailable. Try again shortly.")
		return
	}
	if !allowed {
		writeError(w, http.StatusTooManyRequests, "try_later", "Please wait before requesting another sign-in code.")
		return
	}
	allowed, err = s.allowRateLimit(r.Context(), s.limitKey("email", normalized), 4, time.Hour)
	if err != nil {
		s.logger.Error("apply auth challenge rate limit", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusServiceUnavailable, "request_unavailable", "Sign-in is temporarily unavailable. Try again shortly.")
		return
	}
	if !allowed {
		writeError(w, http.StatusTooManyRequests, "try_later", "Please wait before requesting another sign-in code.")
		return
	}
	code, err := makeCode()
	if err != nil {
		s.logger.Error("create auth challenge", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	challengeID := newUUID()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		s.logger.Error("begin auth challenge", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	defer tx.Rollback()
	var userID string
	var disabled sql.NullTime
	err = tx.QueryRowContext(ctx, `INSERT INTO users(id,email,email_normalized) VALUES($1::uuid,$2,$3)
		ON CONFLICT(email_normalized) DO UPDATE SET updated_at=now() RETURNING id::text, disabled_at`, newUUID(), email, normalized).Scan(&userID, &disabled)
	if err != nil {
		s.logger.Error("upsert auth account", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if !disabled.Valid {
		if _, err = tx.ExecContext(ctx, `UPDATE auth_challenges SET consumed_at=now() WHERE user_id=$1::uuid AND consumed_at IS NULL`, userID); err == nil {
			_, err = tx.ExecContext(ctx, `INSERT INTO auth_challenges(id,user_id,code_digest,expires_at) VALUES($1::uuid,$2::uuid,$3,now()+interval '10 minutes')`, challengeID, userID, s.otpDigest(challengeID, code))
		}
	}
	if err != nil {
		s.logger.Error("store auth challenge", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if err := tx.Commit(); err != nil {
		s.logger.Error("commit auth challenge", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	// The response is deliberately identical for new, existing, and disabled accounts.
	response := map[string]any{"message": "If this address can sign in, a code has been sent."}
	if !disabled.Valid {
		if s.config.DevelopmentCode {
			response["developmentCode"] = code
		} else if err := s.sendCode(email, code); err != nil {
			// Do not include the address or code in logs. The response remains anti-enumerating.
			s.logger.Error("deliver auth challenge", "request_id", requestID(r), "reason", "internal_failure")
			// A code that could not be delivered must not remain usable. If delivery
			// outcome is uncertain, the applicant can request a fresh challenge.
			cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 2*time.Second)
			_, cleanupErr := s.db.ExecContext(cleanupCtx, `UPDATE auth_challenges SET consumed_at=now() WHERE id=$1::uuid AND consumed_at IS NULL`, challengeID)
			cleanupCancel()
			if cleanupErr != nil {
				s.logger.Error("revoke undelivered auth challenge", "request_id", requestID(r), "reason", "internal_failure")
			}
		}
	}
	writeJSON(w, http.StatusAccepted, response)
}

func (s *Server) verifyChallenge(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	var request struct {
		Email   string `json:"email"`
		Code    string `json:"code"`
		MFACode string `json:"mfaCode"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	_, normalized, ok := normalizeEmail(request.Email)
	if !ok || len(request.Code) != 6 {
		writeError(w, http.StatusUnauthorized, "invalid_code", "The code is invalid or expired. Request another code and try again.")
		return
	}
	allowed, err := s.allowRateLimit(r.Context(), s.limitKey("verify-ip", s.clientIP(r)), 20, 15*time.Minute)
	if err != nil {
		s.logger.Error("apply verification rate limit", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusServiceUnavailable, "request_unavailable", "Sign-in is temporarily unavailable. Try again shortly.")
		return
	}
	if !allowed {
		writeError(w, http.StatusTooManyRequests, "try_later", "Please wait before trying another code.")
		return
	}
	allowed, err = s.allowRateLimit(r.Context(), s.limitKey("verify-email", normalized), 10, 15*time.Minute)
	if err != nil {
		s.logger.Error("apply verification rate limit", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusServiceUnavailable, "request_unavailable", "Sign-in is temporarily unavailable. Try again shortly.")
		return
	}
	if !allowed {
		writeError(w, http.StatusTooManyRequests, "try_later", "Please wait before trying another code.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		s.logger.Error("begin verify challenge", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	defer tx.Rollback()
	var userID, challengeID string
	var digest []byte
	var expires time.Time
	var attempts int
	err = tx.QueryRowContext(ctx, `SELECT u.id::text,c.id::text,c.code_digest,c.expires_at,c.attempts
		FROM users u JOIN auth_challenges c ON c.user_id=u.id
		WHERE u.email_normalized=$1 AND u.disabled_at IS NULL AND c.consumed_at IS NULL
		ORDER BY c.created_at DESC LIMIT 1 FOR UPDATE OF c`, normalized).Scan(&userID, &challengeID, &digest, &expires, &attempts)
	if err != nil || time.Now().After(expires) || attempts >= 5 {
		writeError(w, http.StatusUnauthorized, "invalid_code", "The code is invalid or expired. Request another code and try again.")
		return
	}
	if _, err := tx.ExecContext(ctx, `UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1::uuid`, challengeID); err != nil {
		s.logger.Error("increment auth attempt", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if !hmac.Equal(digest, s.otpDigest(challengeID, request.Code)) {
		if err := tx.Commit(); err != nil {
			s.logger.Error("commit invalid auth attempt", "request_id", requestID(r), "reason", "internal_failure")
		}
		writeError(w, http.StatusUnauthorized, "invalid_code", "The code is invalid or expired. Request another code and try again.")
		return
	}
	var disabled, mfaEnabled bool
	var mfaCipher []byte
	var lastMFAStep int64
	if err := tx.QueryRowContext(ctx, `SELECT disabled_at IS NOT NULL,mfa_enabled_at IS NOT NULL,mfa_secret_ciphertext,mfa_last_step FROM users WHERE id=$1::uuid FOR UPDATE`, userID).Scan(&disabled, &mfaEnabled, &mfaCipher, &lastMFAStep); err != nil || disabled {
		writeError(w, http.StatusUnauthorized, "invalid_code", "The code is invalid or expired. Request another code and try again.")
		return
	}
	var mfaVerifiedAt any
	if mfaEnabled {
		secret, decryptErr := s.decryptMFASecret(userID, mfaCipher)
		step, valid := verifyTOTP(secret, request.MFACode, lastMFAStep)
		if decryptErr != nil || !valid {
			if err := tx.Commit(); err != nil {
				s.logger.Error("commit invalid MFA attempt", "request_id", requestID(r), "reason", "internal_failure")
			}
			writeError(w, http.StatusUnauthorized, "invalid_code", "The sign-in code is invalid or expired. Request another code and try again.")
			return
		}
		if _, err := tx.ExecContext(ctx, `UPDATE users SET mfa_last_step=$2 WHERE id=$1::uuid`, userID, step); err != nil {
			s.dbError(w, r, "update MFA counter", err)
			return
		}
		now := time.Now().UTC()
		mfaVerifiedAt = now
	}
	if _, err := tx.ExecContext(ctx, `UPDATE auth_challenges SET consumed_at=now() WHERE id=$1::uuid`, challengeID); err != nil {
		s.logger.Error("consume auth challenge", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if _, err := tx.ExecContext(ctx, `UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()), updated_at=now() WHERE id=$1::uuid`, userID); err != nil {
		s.logger.Error("verify user address", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO role_grants(id,user_id,role) SELECT $1::uuid,$2::uuid,'applicant'
		WHERE NOT EXISTS (SELECT 1 FROM role_grants WHERE user_id=$2::uuid AND role='applicant' AND revoked_at IS NULL)`, newUUID(), userID); err != nil {
		s.logger.Error("grant applicant role", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	rawSession, err := randomToken(32)
	if err != nil {
		s.logger.Error("create session", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	csrf, err := randomToken(32)
	if err != nil {
		s.logger.Error("create csrf token", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	sessionID := newUUID()
	if _, err := tx.ExecContext(ctx, `INSERT INTO sessions(id,user_id,token_digest,csrf_digest,expires_at,mfa_verified_at) VALUES($1::uuid,$2::uuid,$3,$4,now()+interval '12 hours',$5)`, sessionID, userID, tokenDigest(rawSession), tokenDigest(csrf), mfaVerifiedAt); err != nil {
		s.logger.Error("store auth session", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if err := s.recordAudit(ctx, tx, userID, "session.created", "session", sessionID, "success", nil); err != nil {
		s.logger.Error("audit session creation", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if err := tx.Commit(); err != nil {
		s.logger.Error("commit auth session", "request_id", requestID(r), "reason", "internal_failure")
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	s.setSessionCookies(w, rawSession, csrf)
	var user User
	user.ID = userID
	user.MFAEnabled = mfaEnabled
	user.MFAVerified = mfaEnabled
	if err := s.db.QueryRowContext(ctx, `SELECT email FROM users WHERE id=$1::uuid`, userID).Scan(&user.Email); err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	rows, err := s.db.QueryContext(ctx, `SELECT role FROM role_grants WHERE user_id=$1::uuid AND revoked_at IS NULL ORDER BY role`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
			return
		}
		user.Roles = append(user.Roles, role)
	}
	user.MFASetupRequired = (contains(user.Roles, "staff") || contains(user.Roles, "administrator")) && !user.MFAEnabled
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) getSession(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]User{"user": user})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	user, token, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	defer tx.Rollback()
	var sessionID string
	err = tx.QueryRowContext(r.Context(), `UPDATE sessions SET revoked_at=now() WHERE token_digest=$1 AND revoked_at IS NULL RETURNING id::text`, tokenDigest(token)).Scan(&sessionID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "authentication_required", "Sign in to continue.")
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "session.revoked", "session", sessionID, "success", nil); err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return
	}
	clearSessionCookies(w, s.config.SecureCookies)
	writeJSON(w, http.StatusOK, map[string]string{"status": "signed_out"})
}

func (s *Server) setupMFA(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	if !contains(user.Roles, "staff") && !contains(user.Roles, "administrator") {
		writeError(w, http.StatusForbidden, "insufficient_role", "Multi-factor setup is available to staff accounts.")
		return
	}
	if user.MFAEnabled {
		writeError(w, http.StatusConflict, "mfa_already_enabled", "Multi-factor authentication is already active.")
		return
	}
	secretBytes := make([]byte, 20)
	if _, err := rand.Read(secretBytes); err != nil {
		s.dbError(w, r, "create MFA secret", err)
		return
	}
	secret := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secretBytes)
	ciphertext, err := s.encryptMFASecret(user.ID, secret)
	if err != nil {
		s.dbError(w, r, "encrypt MFA secret", err)
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin MFA setup", err)
		return
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(r.Context(), `UPDATE users SET mfa_secret_ciphertext=$2 WHERE id=$1::uuid AND mfa_enabled_at IS NULL`, user.ID, ciphertext); err != nil {
		s.dbError(w, r, "save pending MFA secret", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "auth.mfa_setup_started", "user", user.ID, "success", nil); err != nil {
		s.dbError(w, r, "audit MFA setup", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit MFA setup", err)
		return
	}
	label := url.QueryEscape("Ethio DV Assist:" + user.Email)
	issuer := url.QueryEscape("Ethio DV Assist")
	uri := "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + issuer + "&algorithm=SHA1&digits=6&period=30"
	writeJSON(w, http.StatusOK, map[string]string{"secret": secret, "otpauthUri": uri, "algorithm": "TOTP-SHA1-6 digit-30s"})
}

func (s *Server) activateMFA(w http.ResponseWriter, r *http.Request) {
	user, sessionToken, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	if !contains(user.Roles, "staff") && !contains(user.Roles, "administrator") {
		writeError(w, http.StatusForbidden, "insufficient_role", "Multi-factor setup is available to staff accounts.")
		return
	}
	var request struct {
		Code string `json:"code"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	var ciphertext []byte
	var lastStep int64
	err := s.db.QueryRowContext(r.Context(), `SELECT mfa_secret_ciphertext,mfa_last_step FROM users WHERE id=$1::uuid AND mfa_enabled_at IS NULL`, user.ID).Scan(&ciphertext, &lastStep)
	if err != nil {
		writeError(w, http.StatusConflict, "mfa_setup_missing", "Start multi-factor setup before activating it.")
		return
	}
	secret, err := s.decryptMFASecret(user.ID, ciphertext)
	if err != nil {
		s.dbError(w, r, "decrypt pending MFA secret", err)
		return
	}
	step, valid := verifyTOTP(secret, request.Code, lastStep)
	if !valid {
		writeError(w, http.StatusBadRequest, "invalid_mfa_code", "That code is invalid. Check your authenticator and try again.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin MFA activation", err)
		return
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(r.Context(), `UPDATE users SET mfa_enabled_at=now(),mfa_last_step=$2 WHERE id=$1::uuid AND mfa_enabled_at IS NULL`, user.ID, step); err != nil {
		s.dbError(w, r, "activate MFA", err)
		return
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE sessions SET mfa_verified_at=now() WHERE token_digest=$1 AND revoked_at IS NULL AND expires_at>now()`, tokenDigest(sessionToken)); err != nil {
		s.dbError(w, r, "mark session MFA verified", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "auth.mfa_activated", "user", user.ID, "success", nil); err != nil {
		s.dbError(w, r, "audit MFA activation", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit MFA activation", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "mfa_enabled"})
}

func (s *Server) resetMFA(w http.ResponseWriter, r *http.Request) {
	admin, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, admin, "administrator") {
		return
	}
	targetID := r.PathValue("userID")
	if !uuidPattern.MatchString(targetID) || targetID == admin.ID {
		writeError(w, http.StatusBadRequest, "invalid_mfa_reset", "Choose another staff account.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin MFA reset", err)
		return
	}
	defer tx.Rollback()
	var isPrivileged bool
	err = tx.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM role_grants WHERE user_id=$1::uuid AND role IN ('staff','administrator') AND revoked_at IS NULL)`, targetID).Scan(&isPrivileged)
	if err != nil || !isPrivileged {
		writeError(w, http.StatusNotFound, "staff_user_not_found", "Staff account not found.")
		return
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE users SET mfa_secret_ciphertext=NULL,mfa_enabled_at=NULL,mfa_last_step=0 WHERE id=$1::uuid`, targetID); err != nil {
		s.dbError(w, r, "clear MFA enrollment", err)
		return
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE sessions SET revoked_at=now() WHERE user_id=$1::uuid AND revoked_at IS NULL`, targetID); err != nil {
		s.dbError(w, r, "revoke reset user sessions", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, admin.ID, "user.mfa_reset", "user", targetID, "success", nil); err != nil {
		s.dbError(w, r, "audit MFA reset", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit MFA reset", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "mfa_reset"})
}

func (s *Server) sendCode(email, code string) error {
	if s.config.SMTPAddress == "" || s.config.SMTPFrom == "" {
		return fmt.Errorf("email delivery is not configured")
	}
	host, _, err := net.SplitHostPort(s.config.SMTPAddress)
	if err != nil {
		return fmt.Errorf("invalid SMTP address")
	}
	dial := s.smtpDial
	if dial == nil {
		dial = func(network, address string) (net.Conn, error) {
			return net.DialTimeout(network, address, 10*time.Second)
		}
	}
	conn, err := dial("tcp", s.config.SMTPAddress)
	if err != nil {
		return fmt.Errorf("connect to SMTP relay")
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(15 * time.Second)); err != nil {
		return fmt.Errorf("set SMTP deadline")
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("start SMTP client")
	}
	defer client.Close()
	if supported, _ := client.Extension("STARTTLS"); !supported {
		return fmt.Errorf("SMTP relay does not support STARTTLS")
	}
	if err := client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12, RootCAs: s.config.SMTPRootCAs}); err != nil {
		return fmt.Errorf("start SMTP TLS")
	}
	var auth smtp.Auth
	if s.config.SMTPUsername != "" {
		auth = smtp.PlainAuth("", s.config.SMTPUsername, s.config.SMTPPassword, host)
	}
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("authenticate SMTP relay")
		}
	}
	message := "To: " + email + "\r\nSubject: Your Ethio DV Assist sign-in code\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nYour sign-in code is " + code + ". It expires in 10 minutes. If you did not request it, ignore this message.\r\n"
	if err := client.Mail(s.config.SMTPFrom); err != nil {
		return fmt.Errorf("start SMTP message")
	}
	if err := client.Rcpt(email); err != nil {
		return fmt.Errorf("set SMTP recipient")
	}
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("start SMTP data")
	}
	if _, err := io.WriteString(writer, message); err != nil {
		_ = writer.Close()
		return fmt.Errorf("write SMTP message")
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("finish SMTP message")
	}
	if err := client.Quit(); err != nil {
		return fmt.Errorf("close SMTP transaction: %w", err)
	}
	return nil
}

func (s *Server) otpDigest(challengeID, code string) []byte {
	mac := hmac.New(sha256.New, s.config.AuthOTPPepper)
	_, _ = io.WriteString(mac, challengeID+":"+code)
	return mac.Sum(nil)
}

func (s *Server) limitKey(kind, value string) string {
	mac := hmac.New(sha256.New, s.config.AuthOTPPepper)
	_, _ = io.WriteString(mac, kind+":"+value)
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (s *Server) setSessionCookies(w http.ResponseWriter, session, csrf string) {
	secure := s.config.SecureCookies
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: session, Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode, MaxAge: 12 * 60 * 60})
	http.SetCookie(w, &http.Cookie{Name: csrfCookie, Value: csrf, Path: "/", HttpOnly: false, Secure: secure, SameSite: http.SameSiteStrictMode, MaxAge: 12 * 60 * 60})
}

func clearSessionCookies(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode, MaxAge: -1})
	http.SetCookie(w, &http.Cookie{Name: csrfCookie, Value: "", Path: "/", Secure: secure, SameSite: http.SameSiteStrictMode, MaxAge: -1})
}

func normalizeEmail(value string) (string, string, bool) {
	value = strings.TrimSpace(value)
	if len(value) == 0 || len(value) > 320 {
		return "", "", false
	}
	parsed, err := mail.ParseAddress(value)
	if err != nil || parsed.Address != value || strings.Count(value, "@") != 1 {
		return "", "", false
	}
	normalized := strings.ToLower(value)
	return value, normalized, true
}

func makeCode() (string, error) {
	number, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", number.Int64()), nil
}

func randomToken(length int) (string, error) {
	value := make([]byte, length)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func tokenDigest(token string) []byte {
	digest := sha256.Sum256([]byte(token))
	return digest[:]
}

func constantTimeEqual(left, right string) bool { return hmac.Equal([]byte(left), []byte(right)) }

func (s *Server) clientIP(r *http.Request) string {
	peer, err := remoteAddr(r.RemoteAddr)
	if err != nil {
		return "unknown"
	}
	if !trustedProxy(peer, s.config.TrustedProxyCIDRs) {
		return peer.String()
	}
	values := r.Header.Values("X-Forwarded-For")
	if len(values) == 0 {
		return peer.String()
	}
	var chain []netip.Addr
	for _, value := range values {
		for _, item := range strings.Split(value, ",") {
			address, parseErr := netip.ParseAddr(strings.TrimSpace(item))
			if parseErr != nil {
				return peer.String()
			}
			chain = append(chain, address.Unmap())
		}
	}
	for i := len(chain) - 1; i >= 0; i-- {
		if !trustedProxy(chain[i], s.config.TrustedProxyCIDRs) {
			return chain[i].String()
		}
	}
	return peer.String()
}

func remoteAddr(value string) (netip.Addr, error) {
	host, _, err := net.SplitHostPort(value)
	if err == nil {
		value = host
	}
	address, err := netip.ParseAddr(value)
	if err != nil {
		return netip.Addr{}, err
	}
	return address.Unmap(), nil
}

func trustedProxy(address netip.Addr, prefixes []netip.Prefix) bool {
	for _, prefix := range prefixes {
		if prefix.Contains(address) {
			return true
		}
	}
	return false
}

func (s *Server) allowRateLimit(ctx context.Context, key string, maximum int, window time.Duration) (bool, error) {
	if s.db == nil {
		return s.limit.allow(key, maximum, window), nil
	}
	queryCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var allowed bool
	err := s.db.QueryRowContext(queryCtx, `
		INSERT INTO auth_rate_limits(rate_key, window_started_at, request_count)
		VALUES ($1, statement_timestamp(), 1)
		ON CONFLICT (rate_key) DO UPDATE SET
			window_started_at = CASE
				WHEN auth_rate_limits.window_started_at <= statement_timestamp() - ($3::bigint * interval '1 millisecond')
				THEN statement_timestamp() ELSE auth_rate_limits.window_started_at END,
			request_count = CASE
				WHEN auth_rate_limits.window_started_at <= statement_timestamp() - ($3::bigint * interval '1 millisecond')
				THEN 1 ELSE auth_rate_limits.request_count + 1 END
		RETURNING request_count <= $2`, key, maximum, window.Milliseconds()).Scan(&allowed)
	if err != nil {
		return false, err
	}
	if s.rateCleanupCounter.Add(1)%256 == 0 {
		cleanupCtx, cleanupCancel := context.WithTimeout(ctx, time.Second)
		_, cleanupErr := s.db.ExecContext(cleanupCtx, `
			DELETE FROM auth_rate_limits
			WHERE rate_key IN (
				SELECT rate_key FROM auth_rate_limits
				WHERE window_started_at < statement_timestamp() - interval '24 hours'
				LIMIT 500
			)`)
		cleanupCancel()
		if cleanupErr != nil {
			s.logger.Warn("clean expired auth rate limits", "reason", "database_cleanup_failed")
		}
	}
	return allowed, nil
}

func (s *Server) mfaEncryptionKey() []byte {
	return s.config.MFAEncryptionKey
}

func (s *Server) encryptMFASecret(userID, secret string) ([]byte, error) {
	block, err := aes.NewCipher(s.mfaEncryptionKey())
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return append(nonce, aead.Seal(nil, nonce, []byte(secret), []byte(userID))...), nil
}

func (s *Server) decryptMFASecret(userID string, ciphertext []byte) (string, error) {
	block, err := aes.NewCipher(s.mfaEncryptionKey())
	if err != nil {
		return "", err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(ciphertext) < aead.NonceSize() {
		return "", fmt.Errorf("invalid encrypted MFA secret")
	}
	nonce, encrypted := ciphertext[:aead.NonceSize()], ciphertext[aead.NonceSize():]
	plain, err := aead.Open(nil, nonce, encrypted, []byte(userID))
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func verifyTOTP(secret, code string, lastStep int64) (int64, bool) {
	if len(code) != 6 {
		return 0, false
	}
	decoded, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(strings.TrimSpace(secret)))
	if err != nil {
		return 0, false
	}
	current := time.Now().Unix() / 30
	for step := current - 1; step <= current+1; step++ {
		if step <= lastStep {
			continue
		}
		var counter [8]byte
		binary.BigEndian.PutUint64(counter[:], uint64(step))
		mac := hmac.New(sha1.New, decoded)
		_, _ = mac.Write(counter[:])
		digest := mac.Sum(nil)
		offset := digest[len(digest)-1] & 0x0f
		value := (uint32(digest[offset])&0x7f)<<24 | uint32(digest[offset+1])<<16 | uint32(digest[offset+2])<<8 | uint32(digest[offset+3])
		expected := fmt.Sprintf("%06d", value%1_000_000)
		if hmac.Equal([]byte(expected), []byte(code)) {
			return step, true
		}
	}
	return 0, false
}
