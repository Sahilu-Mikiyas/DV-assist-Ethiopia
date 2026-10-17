package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	email := strings.ToLower(strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_EMAIL")))
	if databaseURL == "" || email == "" || strings.Count(email, "@") != 1 {
		log.Fatal("set DATABASE_URL and BOOTSTRAP_ADMIN_EMAIL to a verified account")
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		log.Fatal("open database")
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		log.Fatal("begin bootstrap")
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `LOCK TABLE role_grants IN EXCLUSIVE MODE`); err != nil {
		log.Fatal("lock bootstrap")
	}
	var admins int
	if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM role_grants WHERE role='administrator' AND revoked_at IS NULL`).Scan(&admins); err != nil {
		log.Fatal("check existing administrator")
	}
	if admins != 0 {
		log.Fatal("an active administrator already exists; use the protected admin API for role changes")
	}
	var userID string
	err = tx.QueryRowContext(ctx, `SELECT id::text FROM users WHERE email_normalized=$1 AND email_verified_at IS NOT NULL AND disabled_at IS NULL FOR UPDATE`, email).Scan(&userID)
	if err != nil {
		log.Fatal("verified account not found; have the user sign in first, then retry")
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO role_grants(id,user_id,role) VALUES($1::uuid,$2::uuid,'administrator')`, uuid(), userID); err != nil {
		log.Fatal("grant initial administrator")
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO audit_events(id,actor_user_id,action,target_type,target_id,request_id,outcome,safe_metadata) VALUES($1::uuid,NULL,'user.role_bootstrapped','user',$2,$3,'success','{}'::jsonb)`, uuid(), userID, "bootstrap-"+uuid()); err != nil {
		log.Fatal("record bootstrap audit")
	}
	if err := tx.Commit(); err != nil {
		log.Fatal("commit bootstrap")
	}
	fmt.Println("Initial administrator role granted. The account must enroll in authenticator-based MFA before staff/admin APIs are available.")
}

func uuid() string {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		log.Fatal("cryptographic random source unavailable")
	}
	value[6] = value[6]&0x0f | 0x40
	value[8] = value[8]&0x3f | 0x80
	encoded := hex.EncodeToString(value[:])
	return encoded[:8] + "-" + encoded[8:12] + "-" + encoded[12:16] + "-" + encoded[16:20] + "-" + encoded[20:]
}
