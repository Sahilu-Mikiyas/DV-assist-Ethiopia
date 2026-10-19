package api

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

const (
	emailOutboxPollInterval  = 2 * time.Second
	emailOutboxLeaseDuration = 30 * time.Second
	emailOutboxMaxAttempts   = 5
)

type emailOutboxPayload struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type emailOutboxItem struct {
	ID          string
	ChallengeID string
	Ciphertext  []byte
	Attempts    int
}

func (s *Server) encryptEmailOutboxPayload(outboxID string, payload emailOutboxPayload) ([]byte, error) {
	if len(s.config.EmailOutboxEncryptionKey) != 32 {
		return nil, errors.New("email outbox encryption key must be 32 bytes")
	}
	plain, err := json.Marshal(payload)
	if err != nil {
		return nil, errors.New("encode email outbox payload")
	}
	block, err := aes.NewCipher(s.config.EmailOutboxEncryptionKey)
	if err != nil {
		return nil, errors.New("initialize email outbox encryption")
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, errors.New("initialize email outbox encryption")
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, errors.New("create email outbox nonce")
	}
	return append(nonce, aead.Seal(nil, nonce, plain, []byte(outboxID))...), nil
}

func (s *Server) decryptEmailOutboxPayload(outboxID string, ciphertext []byte) (emailOutboxPayload, error) {
	if len(s.config.EmailOutboxEncryptionKey) != 32 {
		return emailOutboxPayload{}, errors.New("email outbox encryption key must be 32 bytes")
	}
	block, err := aes.NewCipher(s.config.EmailOutboxEncryptionKey)
	if err != nil {
		return emailOutboxPayload{}, errors.New("initialize email outbox decryption")
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return emailOutboxPayload{}, errors.New("initialize email outbox decryption")
	}
	if len(ciphertext) < aead.NonceSize()+aead.Overhead() {
		return emailOutboxPayload{}, errors.New("invalid email outbox ciphertext")
	}
	nonce := ciphertext[:aead.NonceSize()]
	plain, err := aead.Open(nil, nonce, ciphertext[aead.NonceSize():], []byte(outboxID))
	if err != nil {
		return emailOutboxPayload{}, errors.New("decrypt email outbox payload")
	}
	var payload emailOutboxPayload
	if err := json.Unmarshal(plain, &payload); err != nil || payload.Email == "" || len(payload.Code) != 6 {
		return emailOutboxPayload{}, errors.New("invalid email outbox payload")
	}
	return payload, nil
}

func (s *Server) runEmailOutboxWorker() {
	ticker := time.NewTicker(emailOutboxPollInterval)
	defer ticker.Stop()
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		err := s.deliverNextAuthEmail(ctx)
		cancel()
		if err != nil {
			s.logger.Error("process auth email outbox", "reason", "internal_failure")
		}
		<-ticker.C
	}
}

func (s *Server) deliverNextAuthEmail(ctx context.Context) error {
	if err := s.expireAuthEmailOutbox(ctx); err != nil {
		return err
	}
	item, err := s.claimAuthEmailOutbox(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	payload, err := s.decryptEmailOutboxPayload(item.ID, item.Ciphertext)
	if err != nil {
		if updateErr := s.failAuthEmailOutbox(ctx, item, "payload_decryption_failed", true); updateErr != nil {
			return updateErr
		}
		s.logger.Error("decrypt auth email outbox", "outbox_id", item.ID, "reason", "payload_decryption_failed")
		return nil
	}
	if err := s.sendCode(payload.Email, payload.Code); err != nil {
		if updateErr := s.failAuthEmailOutbox(ctx, item, "smtp_delivery_failed", false); updateErr != nil {
			return updateErr
		}
		s.logger.Warn("auth email delivery attempt failed", "outbox_id", item.ID, "attempt", item.Attempts, "reason", "smtp_delivery_failed")
		return nil
	}
	result, err := s.db.ExecContext(ctx, `
		UPDATE auth_email_outbox
		SET status='delivered', payload_ciphertext=NULL, locked_until=NULL,
		    delivered_at=now(), last_error_code=NULL, updated_at=now()
		WHERE id=$1::uuid AND status='processing'`, item.ID)
	if err != nil {
		return err
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if updated != 1 {
		return errors.New("auth email outbox delivery lease was lost")
	}
	s.logger.Info("auth email delivered", "outbox_id", item.ID, "attempt", item.Attempts)
	return nil
}

func (s *Server) claimAuthEmailOutbox(ctx context.Context) (emailOutboxItem, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return emailOutboxItem{}, err
	}
	defer tx.Rollback()
	var item emailOutboxItem
	err = tx.QueryRowContext(ctx, `
		WITH candidate AS (
			SELECT o.id
			FROM auth_email_outbox o
			JOIN auth_challenges c ON c.id=o.challenge_id
			WHERE (o.status='pending' OR (o.status='processing' AND o.locked_until <= now()))
			  AND o.available_at <= now()
			  AND c.consumed_at IS NULL AND c.expires_at > now()
			ORDER BY o.created_at
			LIMIT 1
			FOR UPDATE OF o SKIP LOCKED
		)
		UPDATE auth_email_outbox o
		SET status='processing', attempts=o.attempts+1,
		    locked_until=now()+($1::bigint * interval '1 millisecond'), updated_at=now()
		FROM candidate
		WHERE o.id=candidate.id
		RETURNING o.id::text, o.challenge_id::text, o.payload_ciphertext, o.attempts`,
		emailOutboxLeaseDuration.Milliseconds()).
		Scan(&item.ID, &item.ChallengeID, &item.Ciphertext, &item.Attempts)
	if err != nil {
		return emailOutboxItem{}, err
	}
	if err := tx.Commit(); err != nil {
		return emailOutboxItem{}, err
	}
	return item, nil
}

func (s *Server) failAuthEmailOutbox(ctx context.Context, item emailOutboxItem, reason string, permanent bool) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	permanent = permanent || item.Attempts >= emailOutboxMaxAttempts
	if permanent {
		result, err := tx.ExecContext(ctx, `
			UPDATE auth_email_outbox
			SET status='failed', payload_ciphertext=NULL, locked_until=NULL,
			    last_error_code=$2, updated_at=now()
			WHERE id=$1::uuid AND status='processing'`, item.ID, reason)
		if err != nil {
			return err
		}
		updated, err := result.RowsAffected()
		if err != nil || updated != 1 {
			return errors.New("auth email outbox failure lease was lost")
		}
		if _, err := tx.ExecContext(ctx, `UPDATE auth_challenges SET consumed_at=now() WHERE id=$1::uuid AND consumed_at IS NULL`, item.ChallengeID); err != nil {
			return err
		}
		return tx.Commit()
	}
	delay := 5 * time.Second * time.Duration(1<<uint(item.Attempts-1))
	result, err := tx.ExecContext(ctx, `
		UPDATE auth_email_outbox
		SET status='pending', locked_until=NULL,
		    available_at=now()+($3::bigint * interval '1 millisecond'),
		    last_error_code=$2, updated_at=now()
		WHERE id=$1::uuid AND status='processing'`, item.ID, reason, delay.Milliseconds())
	if err != nil {
		return err
	}
	updated, err := result.RowsAffected()
	if err != nil || updated != 1 {
		return errors.New("auth email outbox retry lease was lost")
	}
	return tx.Commit()
}

func (s *Server) expireAuthEmailOutbox(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE auth_email_outbox o
		SET status=CASE WHEN c.consumed_at IS NULL THEN 'expired' ELSE 'cancelled' END,
		    payload_ciphertext=NULL, locked_until=NULL, updated_at=now()
		FROM auth_challenges c
		WHERE c.id=o.challenge_id
		  AND o.status IN ('pending', 'processing')
		  AND (c.consumed_at IS NOT NULL OR c.expires_at <= now())`)
	return err
}
