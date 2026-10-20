package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	cycleKeyPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,32}$`)
	uuidPattern     = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
)

type Case struct {
	ID            string     `json:"id"`
	CycleKey      string     `json:"cycleKey"`
	Status        string     `json:"status"`
	Revision      int64      `json:"revision"`
	AssignedStaff *string    `json:"-"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	ClosedAt      *time.Time `json:"closedAt,omitempty"`
}

func (s *Server) createCase(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "applicant") {
		return
	}
	var request struct {
		CycleKey string `json:"cycleKey"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	request.CycleKey = strings.TrimSpace(request.CycleKey)
	if !cycleKeyPattern.MatchString(request.CycleKey) {
		writeError(w, http.StatusBadRequest, "invalid_cycle_key", "Enter a cycle key using letters, numbers, dot, underscore, or hyphen.")
		return
	}
	var schemaVersion int
	var schemaJSON []byte
	err := s.db.QueryRowContext(r.Context(), `SELECT schema_version,schema_json FROM cycle_form_schemas WHERE cycle_key=$1 AND status='verified' AND is_current AND verified_at IS NOT NULL AND approval_one IS NOT NULL AND approval_two IS NOT NULL AND approval_one<>approval_two`, request.CycleKey).Scan(&schemaVersion, &schemaJSON)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusConflict, "cycle_not_available", "This cycle has no independently reviewed form schema, so preparation cases cannot be created.")
		return
	}
	if err != nil {
		s.dbError(w, r, "read current cycle schema", err)
		return
	}
	var schema draftSchema
	if err := json.Unmarshal(schemaJSON, &schema); err != nil {
		s.dbError(w, r, "decode current cycle schema", err)
		return
	}
	fieldCount := 0
	for _, section := range schema.Sections {
		fieldCount += len(section.Fields)
		for _, group := range section.RepeatableGroups {
			fieldCount += len(group.Fields)
		}
	}
	if schema.Cycle != request.CycleKey || schema.SchemaVersion != schemaVersion || schema.Status != "verified" || fieldCount == 0 {
		writeError(w, http.StatusConflict, "cycle_schema_invalid", "This cycle schema is not ready for case creation.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin case create", err)
		return
	}
	defer tx.Rollback()
	created := Case{ID: newUUID()}
	err = tx.QueryRowContext(r.Context(), `INSERT INTO cases(id,owner_user_id,cycle_key) VALUES($1::uuid,$2::uuid,$3)
		RETURNING id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at`, created.ID, user.ID, request.CycleKey).
		Scan(&created.ID, &created.CycleKey, &created.Status, &created.Revision, &created.AssignedStaff, &created.CreatedAt, &created.UpdatedAt, &created.ClosedAt)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "cases_owner_active_cycle_idx") {
			writeError(w, http.StatusConflict, "active_case_exists", "You already have an open case for this cycle.")
			return
		}
		s.dbError(w, r, "insert case", err)
		return
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO case_events(id,case_id,actor_user_id,event_type,new_status) VALUES($1::uuid,$2::uuid,$3::uuid,'case_created',$4)`, newUUID(), created.ID, user.ID, created.Status); err != nil {
		s.dbError(w, r, "insert case event", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "case.created", "case", created.ID, "success", map[string]string{"cycle_key": created.CycleKey}); err != nil {
		s.dbError(w, r, "audit case create", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit case create", err)
		return
	}
	w.Header().Set("ETag", caseETag(created.Revision))
	writeJSON(w, http.StatusCreated, map[string]Case{"case": created})
}

func (s *Server) listMyCases(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "applicant") {
		return
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at
		FROM cases WHERE owner_user_id=$1::uuid ORDER BY updated_at DESC LIMIT 100`, user.ID)
	if err != nil {
		s.dbError(w, r, "list applicant cases", err)
		return
	}
	cases, err := scanCases(rows)
	if err != nil {
		s.dbError(w, r, "scan applicant cases", err)
		return
	}
	if err := recordStandaloneAudit(r.Context(), s.db, user.ID, "case.listed", "case_collection", user.ID, "success"); err != nil {
		s.dbError(w, r, "audit applicant case list", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": cases})
}

func (s *Server) getCase(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	caseID := r.PathValue("caseID")
	if !uuidPattern.MatchString(caseID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	item, allowed, err := s.authorizedCase(r, user, caseID)
	if err != nil {
		s.dbError(w, r, "read case", err)
		return
	}
	if !allowed {
		_ = recordStandaloneAudit(r.Context(), s.db, user.ID, "case.read", "case", caseID, "denied")
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin case read audit", err)
		return
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO case_events(id,case_id,actor_user_id,event_type) VALUES($1::uuid,$2::uuid,$3::uuid,'case_viewed')`, newUUID(), item.ID, user.ID); err != nil {
		s.dbError(w, r, "record case view", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "case.read", "case", item.ID, "success", nil); err != nil {
		s.dbError(w, r, "audit case read", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit case read audit", err)
		return
	}
	w.Header().Set("ETag", caseETag(item.Revision))
	writeJSON(w, http.StatusOK, map[string]Case{"case": item})
}

func (s *Server) caseTimeline(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	caseID := r.PathValue("caseID")
	if !uuidPattern.MatchString(caseID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	_, allowed, err := s.authorizedCase(r, user, caseID)
	if err != nil {
		s.dbError(w, r, "authorize timeline", err)
		return
	}
	if !allowed {
		_ = recordStandaloneAudit(r.Context(), s.db, user.ID, "case.timeline.read", "case", caseID, "denied")
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin timeline read", err)
		return
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO case_events(id,case_id,actor_user_id,event_type) VALUES($1::uuid,$2::uuid,$3::uuid,'timeline_viewed')`, newUUID(), caseID, user.ID); err != nil {
		s.dbError(w, r, "record timeline view", err)
		return
	}
	rows, err := tx.QueryContext(r.Context(), `SELECT event_type,previous_status,new_status,created_at FROM case_events WHERE case_id=$1::uuid ORDER BY created_at,id LIMIT 200`, caseID)
	if err != nil {
		s.dbError(w, r, "read case timeline", err)
		return
	}
	type event struct {
		Type           string    `json:"type"`
		PreviousStatus *string   `json:"previousStatus,omitempty"`
		NewStatus      *string   `json:"newStatus,omitempty"`
		CreatedAt      time.Time `json:"createdAt"`
	}
	items := []event{}
	for rows.Next() {
		var item event
		if err := rows.Scan(&item.Type, &item.PreviousStatus, &item.NewStatus, &item.CreatedAt); err != nil {
			rows.Close()
			s.dbError(w, r, "scan case timeline", err)
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		s.dbError(w, r, "iterate case timeline", err)
		return
	}
	rows.Close()
	if err := s.recordAudit(r.Context(), tx, user.ID, "case.timeline.read", "case", caseID, "success", nil); err != nil {
		s.dbError(w, r, "audit case timeline", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit timeline read", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) listStaffCases(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "staff", "administrator") {
		return
	}
	query := `SELECT id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at FROM cases WHERE assigned_staff_user_id=$1::uuid ORDER BY updated_at DESC LIMIT 100`
	args := []any{user.ID}
	if contains(user.Roles, "administrator") {
		query = `SELECT id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at FROM cases ORDER BY updated_at DESC LIMIT 100`
		args = nil
	}
	rows, err := s.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		s.dbError(w, r, "list staff cases", err)
		return
	}
	cases, err := scanCases(rows)
	if err != nil {
		s.dbError(w, r, "scan staff cases", err)
		return
	}
	if err := recordStandaloneAudit(r.Context(), s.db, user.ID, "staff.case_queue.read", "case_collection", "", "success"); err != nil {
		s.dbError(w, r, "audit staff queue", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": cases})
}

func (s *Server) assignCase(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "administrator") {
		return
	}
	caseID := r.PathValue("caseID")
	if !uuidPattern.MatchString(caseID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	var request struct {
		StaffUserID      string `json:"staffUserId"`
		ExpectedRevision int64  `json:"expectedRevision"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	if !uuidPattern.MatchString(request.StaffUserID) || request.ExpectedRevision < 1 {
		writeError(w, http.StatusBadRequest, "invalid_assignment", "Select an active staff account and current case revision.")
		return
	}
	var isStaff bool
	err := s.db.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM role_grants g JOIN users u ON u.id=g.user_id WHERE g.user_id=$1::uuid AND g.role='staff' AND g.revoked_at IS NULL AND u.disabled_at IS NULL AND u.mfa_enabled_at IS NOT NULL)`, request.StaffUserID).Scan(&isStaff)
	if err != nil {
		s.dbError(w, r, "check staff role", err)
		return
	}
	if !isStaff {
		writeError(w, http.StatusBadRequest, "invalid_assignment", "Select an active staff account and current case revision.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin case assignment", err)
		return
	}
	defer tx.Rollback()
	var item Case
	err = tx.QueryRowContext(r.Context(), `UPDATE cases SET assigned_staff_user_id=$2::uuid,revision=revision+1,updated_at=now()
		WHERE id=$1::uuid AND revision=$3 AND status <> 'closed' RETURNING id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at`, caseID, request.StaffUserID, request.ExpectedRevision).
		Scan(&item.ID, &item.CycleKey, &item.Status, &item.Revision, &item.AssignedStaff, &item.CreatedAt, &item.UpdatedAt, &item.ClosedAt)
	if err != nil {
		writeError(w, http.StatusConflict, "case_revision_conflict", "The case changed. Reload it before assigning.")
		return
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO case_events(id,case_id,actor_user_id,event_type,safe_metadata) VALUES($1::uuid,$2::uuid,$3::uuid,'staff_assigned',jsonb_build_object('staff_user_id',$4::text))`, newUUID(), caseID, user.ID, request.StaffUserID); err != nil {
		s.dbError(w, r, "record staff assignment", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "case.staff_assigned", "case", caseID, "success", map[string]string{"staff_user_id": request.StaffUserID}); err != nil {
		s.dbError(w, r, "audit staff assignment", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit staff assignment", err)
		return
	}
	w.Header().Set("ETag", caseETag(item.Revision))
	writeJSON(w, http.StatusOK, map[string]Case{"case": item})
}

func (s *Server) transitionCase(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "staff", "administrator") {
		return
	}
	caseID := r.PathValue("caseID")
	if !uuidPattern.MatchString(caseID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	var request struct {
		Status           string `json:"status"`
		ExpectedRevision int64  `json:"expectedRevision"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	if request.ExpectedRevision < 1 || !validCaseStatus(request.Status) {
		writeError(w, http.StatusBadRequest, "invalid_transition", "Choose an available case status and provide the current revision.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin case transition", err)
		return
	}
	defer tx.Rollback()
	var current Case
	err = tx.QueryRowContext(r.Context(), `SELECT id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at FROM cases WHERE id=$1::uuid FOR UPDATE`, caseID).
		Scan(&current.ID, &current.CycleKey, &current.Status, &current.Revision, &current.AssignedStaff, &current.CreatedAt, &current.UpdatedAt, &current.ClosedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	if !contains(user.Roles, "administrator") && (current.AssignedStaff == nil || *current.AssignedStaff != user.ID) {
		_ = recordStandaloneAudit(r.Context(), s.db, user.ID, "case.transition", "case", caseID, "denied")
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	if current.Revision != request.ExpectedRevision {
		writeError(w, http.StatusConflict, "case_revision_conflict", "The case changed. Reload it before updating status.")
		return
	}
	if !transitionAllowed(current.Status, request.Status) {
		writeError(w, http.StatusConflict, "invalid_transition", "That status change is not allowed from the current state.")
		return
	}
	var updated Case
	err = tx.QueryRowContext(r.Context(), `UPDATE cases SET status=$2,revision=revision+1,updated_at=now(),closed_at=CASE WHEN $2='closed' THEN now() ELSE NULL END
		WHERE id=$1::uuid AND revision=$3 RETURNING id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at`, caseID, request.Status, request.ExpectedRevision).
		Scan(&updated.ID, &updated.CycleKey, &updated.Status, &updated.Revision, &updated.AssignedStaff, &updated.CreatedAt, &updated.UpdatedAt, &updated.ClosedAt)
	if err != nil {
		s.dbError(w, r, "update case status", err)
		return
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO case_events(id,case_id,actor_user_id,event_type,previous_status,new_status) VALUES($1::uuid,$2::uuid,$3::uuid,'status_changed',$4,$5)`, newUUID(), caseID, user.ID, current.Status, updated.Status); err != nil {
		s.dbError(w, r, "record case status", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "case.status_changed", "case", caseID, "success", map[string]string{"from": current.Status, "to": updated.Status}); err != nil {
		s.dbError(w, r, "audit case status", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit case status", err)
		return
	}
	w.Header().Set("ETag", caseETag(updated.Revision))
	writeJSON(w, http.StatusOK, map[string]Case{"case": updated})
}

func (s *Server) changeRole(w http.ResponseWriter, r *http.Request) {
	admin, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, admin, "administrator") {
		return
	}
	targetID := r.PathValue("userID")
	if !uuidPattern.MatchString(targetID) || targetID == admin.ID {
		writeError(w, http.StatusBadRequest, "invalid_role_change", "Choose another verified account and a supported role.")
		return
	}
	var request struct {
		Role   string `json:"role"`
		Action string `json:"action"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	if (request.Role != "staff" && request.Role != "administrator") || (request.Action != "grant" && request.Action != "revoke") {
		writeError(w, http.StatusBadRequest, "invalid_role_change", "Choose another verified account and a supported role.")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin role change", err)
		return
	}
	defer tx.Rollback()
	if request.Role == "administrator" && request.Action == "revoke" {
		if _, err := tx.ExecContext(r.Context(), `LOCK TABLE role_grants IN EXCLUSIVE MODE`); err != nil {
			s.dbError(w, r, "lock administrator role changes", err)
			return
		}
		var activeAdmins int
		if err := tx.QueryRowContext(r.Context(), `SELECT count(*) FROM role_grants WHERE role='administrator' AND revoked_at IS NULL`).Scan(&activeAdmins); err != nil {
			s.dbError(w, r, "count administrators", err)
			return
		}
		var targetIsAdmin bool
		if err := tx.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM role_grants WHERE user_id=$1::uuid AND role='administrator' AND revoked_at IS NULL)`, targetID).Scan(&targetIsAdmin); err != nil {
			s.dbError(w, r, "check administrator role", err)
			return
		}
		if targetIsAdmin && activeAdmins <= 1 {
			writeError(w, http.StatusConflict, "last_administrator", "The final active administrator cannot be removed.")
			return
		}
	}
	var verified bool
	if err := tx.QueryRowContext(r.Context(), `SELECT email_verified_at IS NOT NULL AND disabled_at IS NULL FROM users WHERE id=$1::uuid FOR UPDATE`, targetID).Scan(&verified); err != nil || !verified {
		writeError(w, http.StatusNotFound, "user_not_found", "Verified account not found.")
		return
	}
	if request.Action == "grant" {
		_, err = tx.ExecContext(r.Context(), `INSERT INTO role_grants(id,user_id,role,granted_by) SELECT $1::uuid,$2::uuid,$3,$4::uuid WHERE NOT EXISTS(SELECT 1 FROM role_grants WHERE user_id=$2::uuid AND role=$3 AND revoked_at IS NULL)`, newUUID(), targetID, request.Role, admin.ID)
	} else {
		_, err = tx.ExecContext(r.Context(), `UPDATE role_grants SET revoked_at=now() WHERE user_id=$1::uuid AND role=$2 AND revoked_at IS NULL`, targetID, request.Role)
	}
	if err != nil {
		s.dbError(w, r, "change user role", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, admin.ID, "user.role_"+request.Action, "user", targetID, "success", map[string]string{"role": request.Role}); err != nil {
		s.dbError(w, r, "audit role change", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit role change", err)
		return
	}
	status := "granted"
	if request.Action == "revoke" {
		status = "revoked"
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (s *Server) listStaffUsers(w http.ResponseWriter, r *http.Request) {
	admin, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, admin, "administrator") {
		return
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT u.id::text,u.email,u.mfa_enabled_at IS NOT NULL FROM users u
		WHERE u.disabled_at IS NULL AND EXISTS(SELECT 1 FROM role_grants g WHERE g.user_id=u.id AND g.role='staff' AND g.revoked_at IS NULL)
		ORDER BY u.email_normalized LIMIT 200`)
	if err != nil {
		s.dbError(w, r, "list staff accounts", err)
		return
	}
	type staffUser struct {
		ID         string `json:"id"`
		Email      string `json:"email"`
		MFAEnabled bool   `json:"mfaEnabled"`
	}
	items := []staffUser{}
	for rows.Next() {
		var item staffUser
		if err := rows.Scan(&item.ID, &item.Email, &item.MFAEnabled); err != nil {
			rows.Close()
			s.dbError(w, r, "scan staff accounts", err)
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		s.dbError(w, r, "iterate staff accounts", err)
		return
	}
	rows.Close()
	if err := recordStandaloneAudit(r.Context(), s.db, admin.ID, "admin.staff_list.read", "user_collection", "", "success"); err != nil {
		s.dbError(w, r, "audit staff list", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) findUser(w http.ResponseWriter, r *http.Request) {
	admin, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, admin, "administrator") {
		return
	}
	var request struct {
		Email string `json:"email"`
	}
	if !parseJSON(w, r, &request) {
		return
	}
	_, normalized, valid := normalizeEmail(request.Email)
	if !valid {
		writeError(w, http.StatusBadRequest, "invalid_email", "Enter the exact verified email address.")
		return
	}
	var item struct {
		ID         string `json:"id"`
		Email      string `json:"email"`
		MFAEnabled bool   `json:"mfaEnabled"`
		Disabled   bool   `json:"disabled"`
	}
	err := s.db.QueryRowContext(r.Context(), `SELECT id::text,email,mfa_enabled_at IS NOT NULL,disabled_at IS NOT NULL FROM users WHERE email_normalized=$1 AND email_verified_at IS NOT NULL`, normalized).Scan(&item.ID, &item.Email, &item.MFAEnabled, &item.Disabled)
	if err != nil {
		writeError(w, http.StatusNotFound, "user_not_found", "Verified account not found.")
		return
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT role FROM role_grants WHERE user_id=$1::uuid AND revoked_at IS NULL ORDER BY role`, item.ID)
	if err != nil {
		s.dbError(w, r, "read account roles", err)
		return
	}
	roles := []string{}
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			rows.Close()
			s.dbError(w, r, "scan account roles", err)
			return
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		s.dbError(w, r, "iterate account roles", err)
		return
	}
	rows.Close()
	if err := recordStandaloneAudit(r.Context(), s.db, admin.ID, "admin.user_lookup", "user", item.ID, "success"); err != nil {
		s.dbError(w, r, "audit user lookup", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": item, "roles": roles})
}

func (s *Server) authorizedCase(r *http.Request, user User, caseID string) (Case, bool, error) {
	var item Case
	err := s.db.QueryRowContext(r.Context(), `SELECT id::text,cycle_key,status,revision,assigned_staff_user_id::text,created_at,updated_at,closed_at FROM cases WHERE id=$1::uuid`, caseID).
		Scan(&item.ID, &item.CycleKey, &item.Status, &item.Revision, &item.AssignedStaff, &item.CreatedAt, &item.UpdatedAt, &item.ClosedAt)
	if err == sql.ErrNoRows {
		return Case{}, false, nil
	}
	if err != nil {
		return Case{}, false, err
	}
	allowed := false
	if contains(user.Roles, "administrator") {
		allowed = true
	}
	if item.AssignedStaff != nil && *item.AssignedStaff == user.ID && contains(user.Roles, "staff") {
		allowed = true
	}
	var owner bool
	if err := s.db.QueryRowContext(r.Context(), `SELECT owner_user_id=$2::uuid FROM cases WHERE id=$1::uuid`, caseID, user.ID).Scan(&owner); err != nil {
		return Case{}, false, err
	}
	return item, allowed || owner, nil
}

func scanCases(rows *sql.Rows) ([]Case, error) {
	defer rows.Close()
	items := []Case{}
	for rows.Next() {
		var item Case
		if err := rows.Scan(&item.ID, &item.CycleKey, &item.Status, &item.Revision, &item.AssignedStaff, &item.CreatedAt, &item.UpdatedAt, &item.ClosedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) dbError(w http.ResponseWriter, r *http.Request, operation string, err error) {
	s.logger.Error(operation, "request_id", requestID(r), "reason", "internal_failure")
	writeError(w, http.StatusInternalServerError, "request_failed", "The request could not be completed.")
}

func caseETag(revision int64) string { return `"rev-` + strconv.FormatInt(revision, 10) + `"` }

func validCaseStatus(status string) bool {
	return status == "in_preparation" || status == "needs_review" || status == "ready_for_applicant" || status == "closed"
}

func transitionAllowed(from, to string) bool {
	switch from {
	case "in_preparation":
		return to == "needs_review"
	case "needs_review":
		return to == "in_preparation" || to == "ready_for_applicant"
	case "ready_for_applicant":
		return to == "needs_review" || to == "closed"
	default:
		return false
	}
}

func contains(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}
