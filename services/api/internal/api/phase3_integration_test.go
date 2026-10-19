package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// These tests use the disposable PostgreSQL database provisioned by CI after
// applying the repository migrations. They intentionally skip on local runs
// without DATABASE_URL so ordinary unit/build checks do not require a database.
func phase3TestDB(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is not set; Phase 3 integration tests require PostgreSQL")
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		t.Fatalf("open PostgreSQL: %v", err)
	}
	db.SetMaxOpenConns(8)
	t.Cleanup(func() { _ = db.Close() })
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("connect PostgreSQL: %v", err)
	}
	return db
}

type phase3Identity struct {
	id      string
	session string
	csrf    string
}

func createPhase3Identity(t *testing.T, db *sql.DB, role string, mfa bool) phase3Identity {
	t.Helper()
	identity := phase3Identity{id: newUUID(), session: newUUID() + newUUID(), csrf: newUUID() + newUUID()}
	email := strings.ReplaceAll(identity.id, "-", "") + "@example.test"
	var mfaEnabled any
	var mfaVerified any
	if mfa {
		mfaEnabled = time.Now().UTC()
		mfaVerified = time.Now().UTC()
	}
	if _, err := db.Exec(`INSERT INTO users(id,email,email_normalized,email_verified_at,mfa_enabled_at) VALUES($1::uuid,$2,$2,now(),$3)`, identity.id, email, mfaEnabled); err != nil {
		t.Fatalf("insert test user: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO role_grants(id,user_id,role) VALUES($1::uuid,$2::uuid,$3)`, newUUID(), identity.id, role); err != nil {
		t.Fatalf("insert test role: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO sessions(id,user_id,token_digest,csrf_digest,expires_at,mfa_verified_at) VALUES($1::uuid,$2::uuid,$3,$4,now()+interval '1 hour',$5)`, newUUID(), identity.id, tokenDigest(identity.session), tokenDigest(identity.csrf), mfaVerified); err != nil {
		t.Fatalf("insert test session: %v", err)
	}
	return identity
}

func createPhase3Case(t *testing.T, db *sql.DB, ownerID string) string {
	t.Helper()
	id := newUUID()
	if _, err := db.Exec(`INSERT INTO cases(id,owner_user_id,cycle_key) VALUES($1::uuid,$2::uuid,$3)`, id, ownerID, "test-"+strings.ReplaceAll(id[:8], "-", "")); err != nil {
		t.Fatalf("insert test case: %v", err)
	}
	return id
}

func phase3Handler(db *sql.DB) http.Handler {
	return New(db, Config{AuthOTPPepper: bytes.Repeat([]byte("p"), 32)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func phase3Request(t *testing.T, handler http.Handler, identity phase3Identity, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var encoded []byte
	if body != nil {
		var err error
		encoded, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("encode request: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(encoded))
	req.AddCookie(&http.Cookie{Name: sessionCookie, Value: identity.session})
	req.AddCookie(&http.Cookie{Name: csrfCookie, Value: identity.csrf})
	if isMutation(method) {
		req.Header.Set("X-CSRF-Token", identity.csrf)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, req)
	return response
}

func TestPhase3ApplicantOwnershipAndAudit(t *testing.T) {
	db := phase3TestDB(t)
	owner := createPhase3Identity(t, db, "applicant", false)
	other := createPhase3Identity(t, db, "applicant", false)
	caseID := createPhase3Case(t, db, owner.id)
	handler := phase3Handler(db)

	if got := phase3Request(t, handler, owner, http.MethodGet, "/api/v1/cases/"+caseID, nil).Code; got != http.StatusOK {
		t.Fatalf("owner GET status = %d, want 200", got)
	}
	if got := phase3Request(t, handler, other, http.MethodGet, "/api/v1/cases/"+caseID, nil).Code; got != http.StatusNotFound {
		t.Fatalf("other applicant GET status = %d, want 404", got)
	}
	var denied, successful int
	err := db.QueryRow(`SELECT count(*) FILTER (WHERE outcome='denied'), count(*) FILTER (WHERE outcome='success') FROM audit_events WHERE target_id=$1 AND action='case.read'`, caseID).Scan(&denied, &successful)
	if err != nil {
		t.Fatalf("query case read audits: %v", err)
	}
	if denied != 1 || successful != 1 {
		t.Fatalf("case read audit counts denied=%d success=%d, want 1 each", denied, successful)
	}
}

func TestPhase3StaffAssignmentAndMFA(t *testing.T) {
	db := phase3TestDB(t)
	owner := createPhase3Identity(t, db, "applicant", false)
	assigned := createPhase3Identity(t, db, "staff", true)
	unassigned := createPhase3Identity(t, db, "staff", true)
	noMFA := createPhase3Identity(t, db, "staff", false)
	caseID := createPhase3Case(t, db, owner.id)
	handler := phase3Handler(db)

	if got := phase3Request(t, handler, noMFA, http.MethodGet, "/api/v1/staff/cases", nil).Code; got != http.StatusForbidden {
		t.Fatalf("staff queue without MFA status = %d, want 403", got)
	}
	if got := phase3Request(t, handler, unassigned, http.MethodGet, "/api/v1/cases/"+caseID, nil).Code; got != http.StatusNotFound {
		t.Fatalf("unassigned staff GET status = %d, want 404", got)
	}
	if _, err := db.Exec(`UPDATE cases SET assigned_staff_user_id=$2::uuid WHERE id=$1::uuid`, caseID, assigned.id); err != nil {
		t.Fatalf("assign test case: %v", err)
	}
	if got := phase3Request(t, handler, assigned, http.MethodGet, "/api/v1/cases/"+caseID, nil).Code; got != http.StatusOK {
		t.Fatalf("assigned staff GET status = %d, want 200", got)
	}
	if got := phase3Request(t, handler, unassigned, http.MethodGet, "/api/v1/cases/"+caseID, nil).Code; got != http.StatusNotFound {
		t.Fatalf("other staff GET status = %d, want 404", got)
	}
	response := phase3Request(t, handler, assigned, http.MethodGet, "/api/v1/staff/cases", nil)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), caseID) {
		t.Fatalf("assigned staff queue response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPhase3ConcurrentRevisionAndLogoutRevocation(t *testing.T) {
	db := phase3TestDB(t)
	owner := createPhase3Identity(t, db, "applicant", false)
	staff := createPhase3Identity(t, db, "staff", true)
	caseID := createPhase3Case(t, db, owner.id)
	if _, err := db.Exec(`UPDATE cases SET assigned_staff_user_id=$2::uuid WHERE id=$1::uuid`, caseID, staff.id); err != nil {
		t.Fatalf("assign test case: %v", err)
	}
	handler := phase3Handler(db)
	payload := map[string]any{"status": "needs_review", "expectedRevision": 1}

	var wait sync.WaitGroup
	statuses := make([]int, 2)
	wait.Add(2)
	for i := range statuses {
		go func(index int) {
			defer wait.Done()
			statuses[index] = phase3Request(t, handler, staff, http.MethodPost, "/api/v1/staff/cases/"+caseID+"/transition", payload).Code
		}(i)
	}
	wait.Wait()
	got200, got409 := 0, 0
	for _, status := range statuses {
		if status == http.StatusOK {
			got200++
		}
		if status == http.StatusConflict {
			got409++
		}
	}
	if got200 != 1 || got409 != 1 {
		t.Fatalf("concurrent transition statuses=%v, want one 200 and one 409", statuses)
	}
	var revision int64
	if err := db.QueryRow(`SELECT revision FROM cases WHERE id=$1::uuid`, caseID).Scan(&revision); err != nil || revision != 2 {
		t.Fatalf("case revision=%d err=%v, want 2", revision, err)
	}

	logout := phase3Request(t, handler, staff, http.MethodPost, "/api/v1/logout", nil)
	if logout.Code != http.StatusOK {
		t.Fatalf("logout status = %d, want 200", logout.Code)
	}
	if got := phase3Request(t, handler, staff, http.MethodGet, "/api/v1/session", nil).Code; got != http.StatusUnauthorized {
		t.Fatalf("session after logout status = %d, want 401", got)
	}
}

func TestPhase3MigrationIsAvailable(t *testing.T) {
	db := phase3TestDB(t)
	var users, cases, auditEvents bool
	err := db.QueryRow(`SELECT to_regclass('public.users') IS NOT NULL, to_regclass('public.cases') IS NOT NULL, to_regclass('public.audit_events') IS NOT NULL`).Scan(&users, &cases, &auditEvents)
	if err != nil {
		t.Fatalf("check migrated schema: %v", err)
	}
	if !users || !cases || !auditEvents {
		t.Fatalf("expected Phase 3 tables, got users=%v cases=%v audit_events=%v", users, cases, auditEvents)
	}
}
