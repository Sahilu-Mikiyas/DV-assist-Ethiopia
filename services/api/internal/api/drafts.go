package api

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const maxDraftBytes = 128 * 1024

func (s *Server) getCurrentCycleFormSchema(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "applicant") {
		return
	}
	cycle := strings.TrimSpace(r.PathValue("cycleKey"))
	if !cycleKeyPattern.MatchString(cycle) {
		writeError(w, http.StatusBadRequest, "invalid_cycle_key", "Enter a valid cycle key.")
		return
	}
	var version int
	var body []byte
	err := s.db.QueryRowContext(r.Context(), `SELECT schema_version,schema_json FROM cycle_form_schemas WHERE cycle_key=$1 AND status='verified' AND is_current AND verified_at IS NOT NULL AND approval_one IS NOT NULL AND approval_two IS NOT NULL AND approval_one<>approval_two`, cycle).Scan(&version, &body)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusConflict, "cycle_not_available", "This cycle has no independently reviewed form schema, so answer collection is disabled.")
		return
	}
	if err != nil {
		s.dbError(w, r, "read current form schema", err)
		return
	}
	var schema draftSchema
	if err := json.Unmarshal(body, &schema); err != nil {
		s.dbError(w, r, "decode current form schema", err)
		return
	}
	if schema.Cycle != cycle || schema.SchemaVersion != version || schema.Status != "verified" {
		writeError(w, http.StatusConflict, "cycle_schema_invalid", "This cycle schema is not in a usable verified state.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"schemaVersion": version, "schema": json.RawMessage(body)})
}

type draftSchema struct {
	SchemaVersion int    `json:"schemaVersion"`
	Cycle         string `json:"cycle"`
	Status        string `json:"status"`
	Sections      []struct {
		Fields           []draftField `json:"fields"`
		RepeatableGroups []struct {
			ID          string       `json:"id"`
			MaxItems    int          `json:"maxItems"`
			UniqueField string       `json:"uniqueField"`
			Fields      []draftField `json:"fields"`
		} `json:"repeatableGroups"`
	} `json:"sections"`
}

type draftField struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	MaxLength int    `json:"maxLength"`
	Options   []struct {
		Value string `json:"value"`
	} `json:"options"`
}

type draftGroup struct {
	Fields      []draftField
	MaxItems    int
	UniqueField string
}

func (s *Server) getCaseDraft(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "applicant") {
		return
	}
	caseID := r.PathValue("caseID")
	if !uuidPattern.MatchString(caseID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	if !s.requireDraftOwner(w, r, user.ID, caseID) {
		return
	}
	if len(s.config.ApplicantDataEncryptionKey) != 32 {
		writeError(w, http.StatusServiceUnavailable, "draft_storage_unavailable", "Secure draft storage is not configured.")
		return
	}
	cycle, err := s.caseCycle(r, caseID)
	if err != nil {
		s.dbError(w, r, "read draft cycle", err)
		return
	}
	var ciphertext []byte
	var revision int64
	var schemaVersion int
	err = s.db.QueryRowContext(r.Context(), `SELECT ciphertext,revision,schema_version FROM case_drafts WHERE case_id=$1::uuid`, caseID).Scan(&ciphertext, &revision, &schemaVersion)
	if errors.Is(err, sql.ErrNoRows) {
		_, version, _, available := s.availableDraftSchema(w, r, caseID)
		if !available {
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"revision": int64(0), "answers": map[string]any{}, "schemaVersion": version})
		return
	}
	if err != nil {
		s.dbError(w, r, "read encrypted draft", err)
		return
	}
	schemaVersion, schemaJSON, ok := s.versionedDraftSchema(w, r, cycle, schemaVersion)
	if !ok {
		return
	}
	var schema draftSchema
	if err := json.Unmarshal(schemaJSON, &schema); err != nil {
		s.dbError(w, r, "decode pinned draft schema", err)
		return
	}
	if schema.Cycle != cycle || schema.SchemaVersion != schemaVersion || schema.Status != "verified" {
		writeError(w, http.StatusConflict, "draft_schema_invalid", "This draft's reviewed form schema is not usable.")
		return
	}
	plain, err := s.decryptCaseDraft(caseID, cycle, schemaVersion, ciphertext)
	if err != nil {
		s.dbError(w, r, "decrypt applicant draft", err)
		return
	}
	var answers map[string]any
	if err := json.Unmarshal(plain, &answers); err != nil {
		s.dbError(w, r, "decode applicant draft", err)
		return
	}
	if err := recordStandaloneAudit(r.Context(), s.db, user.ID, "case.draft.read", "case", caseID, "success"); err != nil {
		s.dbError(w, r, "audit draft read", err)
		return
	}
	w.Header().Set("ETag", caseETag(revision))
	writeJSON(w, http.StatusOK, map[string]any{"revision": revision, "answers": answers, "schemaVersion": schemaVersion})
}

func (s *Server) saveCaseDraft(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.requireUser(w, r)
	if !ok || !s.requireRole(w, r, user, "applicant") {
		return
	}
	caseID := r.PathValue("caseID")
	if !uuidPattern.MatchString(caseID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return
	}
	if !s.requireDraftOwner(w, r, user.ID, caseID) {
		return
	}
	cycle, schemaVersion, schemaJSON, ok := s.availableDraftSchema(w, r, caseID)
	if !ok {
		return
	}
	if len(s.config.ApplicantDataEncryptionKey) != 32 {
		writeError(w, http.StatusServiceUnavailable, "draft_storage_unavailable", "Secure draft storage is not configured.")
		return
	}
	var request struct {
		ExpectedRevision int64          `json:"expectedRevision"`
		Answers          map[string]any `json:"answers"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxDraftBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Send draft answers and the current revision.")
		return
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid_request", "Send one JSON object only.")
		return
	}
	if request.ExpectedRevision < 0 || request.Answers == nil {
		writeError(w, http.StatusBadRequest, "invalid_draft", "Draft answers and a valid revision are required.")
		return
	}
	var schema draftSchema
	if err := json.Unmarshal(schemaJSON, &schema); err != nil {
		s.dbError(w, r, "decode verified form schema", err)
		return
	}
	if schema.Cycle != cycle || schema.SchemaVersion != schemaVersion || schema.Status != "verified" {
		writeError(w, http.StatusConflict, "cycle_schema_invalid", "This cycle schema is not in a usable verified state.")
		return
	}
	if err := validateDraftAnswers(schema, request.Answers); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_draft_answers", err.Error())
		return
	}
	plain, err := json.Marshal(request.Answers)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_draft", "Draft answers could not be saved.")
		return
	}
	ciphertext, err := s.encryptCaseDraft(caseID, cycle, schemaVersion, plain)
	if err != nil {
		s.dbError(w, r, "encrypt applicant draft", err)
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.dbError(w, r, "begin draft save", err)
		return
	}
	defer tx.Rollback()
	var revision int64
	err = tx.QueryRowContext(r.Context(), `INSERT INTO case_drafts(case_id,cycle_key,schema_version,ciphertext,revision)
		SELECT $1::uuid,$2,$3,$4,1 WHERE $5=0
		ON CONFLICT (case_id) DO UPDATE SET schema_version=EXCLUDED.schema_version,ciphertext=EXCLUDED.ciphertext,revision=case_drafts.revision+1,updated_at=now()
		WHERE case_drafts.revision=$5 AND case_drafts.cycle_key=EXCLUDED.cycle_key
		RETURNING revision`, caseID, cycle, schemaVersion, ciphertext, request.ExpectedRevision).Scan(&revision)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusConflict, "draft_revision_conflict", "This draft changed. Reload it before saving again.")
		return
	}
	if err != nil {
		s.dbError(w, r, "persist encrypted draft", err)
		return
	}
	if err := s.recordAudit(r.Context(), tx, user.ID, "case.draft.saved", "case", caseID, "success", map[string]string{"schema_version": fmt.Sprint(schemaVersion)}); err != nil {
		s.dbError(w, r, "audit draft save", err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.dbError(w, r, "commit draft save", err)
		return
	}
	w.Header().Set("ETag", caseETag(revision))
	writeJSON(w, http.StatusOK, map[string]any{"revision": revision, "schemaVersion": schemaVersion})
}

func (s *Server) requireDraftOwner(w http.ResponseWriter, r *http.Request, userID, caseID string) bool {
	var owner, status string
	err := s.db.QueryRowContext(r.Context(), `SELECT owner_user_id::text,status FROM cases WHERE id=$1::uuid`, caseID).Scan(&owner, &status)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && owner != userID) {
		writeError(w, http.StatusNotFound, "case_not_found", "Case not found.")
		return false
	}
	if err != nil {
		s.dbError(w, r, "authorize applicant draft", err)
		return false
	}
	if status == "closed" {
		writeError(w, http.StatusConflict, "case_closed", "This case is closed and its draft cannot be changed.")
		return false
	}
	return true
}

func (s *Server) availableDraftSchema(w http.ResponseWriter, r *http.Request, caseID string) (string, int, []byte, bool) {
	cycle, err := s.caseCycle(r, caseID)
	if err != nil {
		s.dbError(w, r, "read draft cycle", err)
		return "", 0, nil, false
	}
	var version int
	var body []byte
	err = s.db.QueryRowContext(r.Context(), `SELECT schema_version,schema_json FROM cycle_form_schemas WHERE cycle_key=$1 AND status='verified' AND is_current AND verified_at IS NOT NULL AND approval_one IS NOT NULL AND approval_two IS NOT NULL AND approval_one<>approval_two`, cycle).Scan(&version, &body)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusConflict, "cycle_not_available", "This cycle has no independently reviewed form schema, so answer collection is disabled.")
		return "", 0, nil, false
	}
	if err != nil {
		s.dbError(w, r, "read reviewed form schema", err)
		return "", 0, nil, false
	}
	var schema draftSchema
	if err := json.Unmarshal(body, &schema); err != nil {
		s.dbError(w, r, "decode reviewed form schema", err)
		return "", 0, nil, false
	}
	if schema.Cycle != cycle || schema.SchemaVersion != version || schema.Status != "verified" {
		writeError(w, http.StatusConflict, "cycle_schema_invalid", "This cycle schema is not in a usable verified state.")
		return "", 0, nil, false
	}
	return cycle, version, body, true
}

func (s *Server) caseCycle(r *http.Request, caseID string) (string, error) {
	var cycle string
	err := s.db.QueryRowContext(r.Context(), `SELECT cycle_key FROM cases WHERE id=$1::uuid`, caseID).Scan(&cycle)
	return cycle, err
}

func (s *Server) versionedDraftSchema(w http.ResponseWriter, r *http.Request, cycle string, version int) (int, []byte, bool) {
	var body []byte
	err := s.db.QueryRowContext(r.Context(), `SELECT schema_json FROM cycle_form_schemas WHERE cycle_key=$1 AND schema_version=$2 AND status='verified' AND verified_at IS NOT NULL AND approval_one IS NOT NULL AND approval_two IS NOT NULL AND approval_one<>approval_two`, cycle, version).Scan(&body)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusConflict, "draft_schema_unavailable", "This draft's reviewed form schema is unavailable.")
		return 0, nil, false
	}
	if err != nil {
		s.dbError(w, r, "read pinned draft schema", err)
		return 0, nil, false
	}
	return version, body, true
}

func (s *Server) encryptCaseDraft(caseID, cycle string, version int, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.config.ApplicantDataEncryptionKey)
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
	return append(nonce, aead.Seal(nil, nonce, plaintext, draftAAD(caseID, cycle, version))...), nil
}

func (s *Server) decryptCaseDraft(caseID, cycle string, version int, ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.config.ApplicantDataEncryptionKey)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(ciphertext) < aead.NonceSize() {
		return nil, fmt.Errorf("invalid encrypted draft")
	}
	return aead.Open(nil, ciphertext[:aead.NonceSize()], ciphertext[aead.NonceSize():], draftAAD(caseID, cycle, version))
}

func draftAAD(caseID, cycle string, version int) []byte {
	return []byte(strings.Join([]string{"ethio-dv-assist-draft-v1", caseID, cycle, fmt.Sprint(version)}, ":"))
}

func validateDraftAnswers(schema draftSchema, answers map[string]any) error {
	known := map[string]draftField{}
	groups := map[string]draftGroup{}
	for _, section := range schema.Sections {
		for _, field := range section.Fields {
			known[field.ID] = field
		}
		for _, group := range section.RepeatableGroups {
			groups[group.ID] = draftGroup{Fields: group.Fields, MaxItems: group.MaxItems, UniqueField: group.UniqueField}
		}
	}
	for key, value := range answers {
		if field, ok := known[key]; ok {
			if err := validateDraftField(field, value); err != nil {
				return fmt.Errorf("Invalid value for %s.", key)
			}
			continue
		}
		group, ok := groups[key]
		if !ok {
			return fmt.Errorf("Unknown answer field: %s.", key)
		}
		items, ok := value.([]any)
		if !ok || len(items) > group.MaxItems {
			return fmt.Errorf("Invalid entries for %s.", key)
		}
		uniqueValues := map[string]bool{}
		for _, item := range items {
			row, ok := item.(map[string]any)
			if !ok {
				return fmt.Errorf("Invalid entry in %s.", key)
			}
			allowed := map[string]bool{}
			for _, field := range group.Fields {
				allowed[field.ID] = true
				if v, exists := row[field.ID]; exists && validateDraftField(field, v) != nil {
					return fmt.Errorf("Invalid value for %s.%s.", key, field.ID)
				}
			}
			if unique := row[group.UniqueField]; unique != nil {
				if value, isString := unique.(string); isString && value != "" {
					if uniqueValues[value] {
						return fmt.Errorf("Duplicate values for %s.%s.", key, group.UniqueField)
					}
					uniqueValues[value] = true
				}
			}
			for fieldID := range row {
				if !allowed[fieldID] {
					return fmt.Errorf("Unknown answer field: %s.%s.", key, fieldID)
				}
			}
		}
	}
	return nil
}

func validateDraftField(field draftField, value any) error {
	switch field.Type {
	case "text", "textarea", "date":
		text, ok := value.(string)
		if !ok || (field.MaxLength > 0 && len([]rune(text)) > field.MaxLength) {
			return errors.New("invalid text")
		}
		if field.Type == "date" && text != "" {
			if _, err := time.Parse("2006-01-02", text); err != nil {
				return errors.New("invalid date")
			}
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return errors.New("invalid boolean")
		}
	case "select":
		text, ok := value.(string)
		if !ok {
			return errors.New("invalid option")
		}
		found := false
		for _, option := range field.Options {
			if option.Value == text {
				found = true
				break
			}
		}
		if !found {
			return errors.New("unknown option")
		}
	default:
		return errors.New("unsupported field type")
	}
	return nil
}
