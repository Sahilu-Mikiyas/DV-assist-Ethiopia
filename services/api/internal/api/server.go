package api

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"database/sql"
)

type Config struct {
	AppEnv           string
	AuthOTPPepper    []byte
	MFAEncryptionKey []byte
	SMTPAddress      string
	SMTPUsername     string
	SMTPPassword     string
	SMTPFrom         string
	PublicOrigin     string
	SecureCookies    bool
	DevelopmentCode  bool
}

type Server struct {
	db     *sql.DB
	config Config
	logger *slog.Logger
	limit  *rateLimiter
}

type contextKey string

const (
	requestIDKey  contextKey = "request_id"
	csrfCookie               = "dv_csrf"
	sessionCookie            = "dv_session"
)

type User struct {
	ID               string   `json:"id"`
	Email            string   `json:"email"`
	Roles            []string `json:"roles"`
	MFAEnabled       bool     `json:"mfaEnabled"`
	MFAVerified      bool     `json:"mfaVerified"`
	MFASetupRequired bool     `json:"mfaSetupRequired"`
}

func New(db *sql.DB, config Config, logger *slog.Logger) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	s := &Server{db: db, config: config, logger: logger, limit: newRateLimiter()}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /api/v1/demo/cases", s.demoCases)
	mux.HandleFunc("POST /api/v1/auth/challenges", s.requestChallenge)
	mux.HandleFunc("POST /api/v1/auth/verify", s.verifyChallenge)
	mux.HandleFunc("GET /api/v1/session", s.getSession)
	mux.HandleFunc("POST /api/v1/logout", s.logout)
	mux.HandleFunc("POST /api/v1/auth/mfa/setup", s.setupMFA)
	mux.HandleFunc("POST /api/v1/auth/mfa/activate", s.activateMFA)
	mux.HandleFunc("POST /api/v1/cases", s.createCase)
	mux.HandleFunc("GET /api/v1/cases", s.listMyCases)
	mux.HandleFunc("GET /api/v1/cases/{caseID}", s.getCase)
	mux.HandleFunc("GET /api/v1/cases/{caseID}/events", s.caseTimeline)
	mux.HandleFunc("GET /api/v1/staff/cases", s.listStaffCases)
	mux.HandleFunc("GET /api/v1/admin/staff", s.listStaffUsers)
	mux.HandleFunc("POST /api/v1/admin/users/lookup", s.findUser)
	mux.HandleFunc("POST /api/v1/staff/cases/{caseID}/assignment", s.assignCase)
	mux.HandleFunc("POST /api/v1/staff/cases/{caseID}/transition", s.transitionCase)
	mux.HandleFunc("POST /api/v1/admin/users/{userID}/roles", s.changeRole)
	mux.HandleFunc("POST /api/v1/admin/users/{userID}/mfa-reset", s.resetMFA)
	mux.HandleFunc("GET /", s.notFound)
	return s.middleware(mux)
}

func (s *Server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setSecurityHeaders(w)
		requestID := make([]byte, 16)
		if _, err := rand.Read(requestID); err != nil {
			http.Error(w, "request failed", http.StatusInternalServerError)
			return
		}
		id := hex.EncodeToString(requestID)
		w.Header().Set("X-Request-ID", id)
		ctx := contextWithRequestID(r, id)
		r = r.WithContext(ctx)
		if isMutation(r.Method) {
			if !s.validOrigin(r) {
				writeError(w, http.StatusForbidden, "request_origin_not_allowed", "Request origin is not allowed.")
				return
			}
			if _, err := r.Cookie(sessionCookie); err == nil && r.URL.Path != "/api/v1/auth/verify" {
				if !s.validCSRF(r) {
					writeError(w, http.StatusForbidden, "csrf_check_failed", "Reload the page and try again.")
					return
				}
			}
		}
		wrapped := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		started := time.Now()
		next.ServeHTTP(wrapped, r)
		route := r.Pattern
		if route == "" {
			route = "unmatched"
		}
		s.logger.Info("http request", "request_id", id, "method", r.Method, "route", route, "status", wrapped.status, "duration_ms", time.Since(started).Milliseconds())
	})
}

func (s *Server) validCSRF(r *http.Request) bool {
	session, sessionErr := r.Cookie(sessionCookie)
	csrf, csrfErr := r.Cookie(csrfCookie)
	header := r.Header.Get("X-CSRF-Token")
	if sessionErr != nil || csrfErr != nil || header == "" || !constantTimeEqual(csrf.Value, header) || s.db == nil {
		return false
	}
	var digest []byte
	err := s.db.QueryRowContext(r.Context(), `SELECT csrf_digest FROM sessions WHERE token_digest=$1 AND revoked_at IS NULL AND expires_at>now()`, tokenDigest(session.Value)).Scan(&digest)
	return err == nil && hmac.Equal(digest, tokenDigest(csrf.Value))
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (s *Server) validOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	if s.config.PublicOrigin != "" {
		return strings.TrimRight(origin, "/") == strings.TrimRight(s.config.PublicOrigin, "/")
	}
	return strings.EqualFold(origin, "http://"+r.Host) || strings.EqualFold(origin, "https://"+r.Host)
}

func isMutation(method string) bool {
	return method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions
}

func setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
	w.Header().Set("Cache-Control", "no-store")
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) demoCases(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"items": []map[string]string{
		{"id": "DEMO-1042", "name": "Aster Example", "language": "Amharic", "status": "Needs review", "note": "Confirm the fictional profile is complete."},
		{"id": "DEMO-1041", "name": "Bekele Sample", "language": "English", "status": "In preparation", "note": ""},
		{"id": "DEMO-1040", "name": "Hana Placeholder", "language": "Amharic", "status": "Ready for applicant", "note": "Demo case only."},
	}})
}

func (s *Server) notFound(w http.ResponseWriter, r *http.Request) {
	http.NotFound(w, r)
}

func (s *Server) ready(w http.ResponseWriter) bool {
	if s.db != nil {
		return true
	}
	writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Account and case features are not configured on this development server.")
	return false
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		return
	}
}

type errorResponse struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		RequestID string `json:"requestId"`
	} `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	response := errorResponse{}
	response.Error.Code = code
	response.Error.Message = message
	if id, ok := requestIDFromResponse(w); ok {
		response.Error.RequestID = id
	}
	writeJSON(w, status, response)
}

// requestIDFromResponse reads the request ID already set on the writer. It is
// kept separate so error bodies do not need to expose any caller data.
func requestIDFromResponse(w http.ResponseWriter) (string, bool) {
	id := w.Header().Get("X-Request-ID")
	return id, id != ""
}

func contextWithRequestID(r *http.Request, id string) context.Context {
	return context.WithValue(r.Context(), requestIDKey, id)
}

func requestID(r *http.Request) string {
	id, _ := r.Context().Value(requestIDKey).(string)
	return id
}

func (s *Server) requireUser(w http.ResponseWriter, r *http.Request) (User, string, bool) {
	if !s.ready(w) {
		return User{}, "", false
	}
	cookie, err := r.Cookie(sessionCookie)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "authentication_required", "Sign in to continue.")
		return User{}, "", false
	}
	var user User
	var roles []string
	var expires time.Time
	var mfaEnabled, mfaVerified bool
	err = s.db.QueryRowContext(r.Context(), `
		SELECT u.id::text, u.email, s.expires_at, u.mfa_enabled_at IS NOT NULL, s.mfa_verified_at IS NOT NULL
		FROM sessions s JOIN users u ON u.id=s.user_id
		WHERE s.token_digest=$1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.disabled_at IS NULL`, tokenDigest(cookie.Value)).Scan(&user.ID, &user.Email, &expires, &mfaEnabled, &mfaVerified)
	if err != nil {
		clearSessionCookies(w, s.config.SecureCookies)
		writeError(w, http.StatusUnauthorized, "authentication_required", "Sign in to continue.")
		return User{}, "", false
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT role FROM role_grants WHERE user_id=$1::uuid AND revoked_at IS NULL ORDER BY role`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return User{}, "", false
	}
	defer rows.Close()
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
			return User{}, "", false
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
		return User{}, "", false
	}
	user.Roles = roles
	user.MFAEnabled = mfaEnabled
	user.MFAVerified = mfaVerified
	user.MFASetupRequired = (contains(roles, "staff") || contains(roles, "administrator")) && !mfaEnabled
	return user, cookie.Value, true
}

func (s *Server) requireRole(w http.ResponseWriter, r *http.Request, user User, allowed ...string) bool {
	for _, role := range user.Roles {
		for _, candidate := range allowed {
			if role == candidate {
				if (role == "staff" || role == "administrator") && (!user.MFAEnabled || !user.MFAVerified) {
					writeError(w, http.StatusForbidden, "mfa_required", "Set up or verify multi-factor authentication to use staff features.")
					return false
				}
				return true
			}
		}
	}
	writeError(w, http.StatusForbidden, "insufficient_role", "You do not have permission to perform this action.")
	return false
}

func (s *Server) recordAudit(ctx context.Context, tx *sql.Tx, actorID, action, targetType, targetID, outcome string, metadata map[string]string) error {
	if metadata == nil {
		metadata = map[string]string{}
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("encode audit metadata: %w", err)
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO audit_events(id, actor_user_id, action, target_type, target_id, request_id, outcome, safe_metadata) VALUES($1::uuid, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), $6, $7, $8::jsonb)`, newUUID(), actorID, action, targetType, targetID, requestIDFromContext(ctx), outcome, string(encoded))
	return err
}

func requestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDKey).(string); ok {
		return id
	}
	return "unknown"
}

func recordStandaloneAudit(ctx context.Context, db *sql.DB, actorID, action, targetType, targetID, outcome string) error {
	encoded := []byte(`{}`)
	_, err := db.ExecContext(ctx, `INSERT INTO audit_events(id, actor_user_id, action, target_type, target_id, request_id, outcome, safe_metadata) VALUES($1::uuid, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), $6, $7, $8::jsonb)`, newUUID(), actorID, action, targetType, targetID, requestIDFromContext(ctx), outcome, string(encoded))
	return err
}

func parseJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 16*1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Check the request fields and try again.")
		return false
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid_request", "Send one JSON object only.")
		return false
	}
	return true
}

func newUUID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic("cryptographic random source unavailable")
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
