package api

import (
	"net/http"
	"time"
)

type emailOutboxStatusResponse struct {
	ObservedAt                time.Time `json:"observedAt"`
	ReadyPending               int64     `json:"readyPending"`
	OldestReadyPendingSeconds  int64     `json:"oldestReadyPendingSeconds"`
	ScheduledRetries           int64     `json:"scheduledRetries"`
	Processing                 int64     `json:"processing"`
	ExpiredProcessingLeases    int64     `json:"expiredProcessingLeases"`
	FailedLast15Minutes        int64     `json:"failedLast15Minutes"`
}

func (s *Server) emailOutboxStatus(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "administrator") {
		return
	}

	var status emailOutboxStatusResponse
	err := s.db.QueryRowContext(r.Context(), `
		SELECT now(),
		       count(*) FILTER (WHERE status = 'pending' AND available_at <= now()),
		       COALESCE(max(extract(epoch FROM (now() - created_at))) FILTER (
		           WHERE status = 'pending' AND available_at <= now()
		       ), 0)::bigint,
		       count(*) FILTER (WHERE status = 'pending' AND available_at > now()),
		       count(*) FILTER (WHERE status = 'processing'),
		       count(*) FILTER (WHERE status = 'processing' AND locked_until <= now()),
		       count(*) FILTER (
		           WHERE status = 'failed' AND updated_at >= now() - interval '15 minutes'
		       )
		FROM auth_email_outbox`).Scan(
		&status.ObservedAt,
		&status.ReadyPending,
		&status.OldestReadyPendingSeconds,
		&status.ScheduledRetries,
		&status.Processing,
		&status.ExpiredProcessingLeases,
		&status.FailedLast15Minutes,
	)
	if err != nil {
		s.dbError(w, r, "read auth email outbox status", err)
		return
	}
	if err := recordStandaloneAudit(r.Context(), s.db, user.ID, "admin.auth_email_outbox.viewed", "auth_email_outbox", "", "success"); err != nil {
		s.dbError(w, r, "audit auth email outbox status", err)
		return
	}
	writeJSON(w, http.StatusOK, status)
}
