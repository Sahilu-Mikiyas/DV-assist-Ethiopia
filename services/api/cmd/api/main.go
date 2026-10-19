package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/mail"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Sahilu-Mikiyas/DV-assist-Ethiopia/services/api/internal/api"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	address := env("HTTP_ADDR", "127.0.0.1:8081")
	appEnv := env("APP_ENV", "development")
	if appEnv != "development" && appEnv != "staging" && appEnv != "production" {
		logger.Error("APP_ENV must be development, staging, or production")
		os.Exit(1)
	}
	webRoot := env("WEB_ROOT", filepath.Join("..", "..", "apps", "web"))
	trustedProxyCIDRs, parseErr := parseTrustedProxyCIDRs(os.Getenv("TRUSTED_PROXY_CIDRS"))
	if parseErr != nil {
		logger.Error("TRUSTED_PROXY_CIDRS must be a comma-separated list of valid, non-global CIDR prefixes")
		os.Exit(1)
	}
	var db *sql.DB
	var mfaKey []byte
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		pepper := os.Getenv("AUTH_OTP_PEPPER")
		if len(pepper) < 32 {
			logger.Error("AUTH_OTP_PEPPER must be at least 32 characters when DATABASE_URL is configured")
			os.Exit(1)
		}
		decodedKey, decodeErr := base64.StdEncoding.DecodeString(os.Getenv("MFA_ENCRYPTION_KEY_B64"))
		if decodeErr != nil || len(decodedKey) != 32 {
			logger.Error("MFA_ENCRYPTION_KEY_B64 must decode to exactly 32 bytes when DATABASE_URL is configured")
			os.Exit(1)
		}
		mfaKey = decodedKey
		var err error
		db, err = sql.Open("pgx", databaseURL)
		if err != nil {
			logger.Error("open PostgreSQL database", "reason", "configuration_error")
			os.Exit(1)
		}
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(30 * time.Minute)
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		err = db.PingContext(ctx)
		cancel()
		if err != nil {
			logger.Error("connect PostgreSQL database", "reason", "connection_failed")
			os.Exit(1)
		}
		defer db.Close()
	} else {
		logger.Warn("DATABASE_URL is not configured; account and case routes will return service unavailable")
	}
	if appEnv == "production" {
		origin, originErr := url.Parse(os.Getenv("PUBLIC_ORIGIN"))
		_, _, smtpErr := net.SplitHostPort(os.Getenv("SMTP_ADDR"))
		from, fromErr := mail.ParseAddress(os.Getenv("SMTP_FROM"))
		if db == nil || originErr != nil || origin.Scheme != "https" || origin.Host == "" || (origin.Path != "" && origin.Path != "/") || origin.User != nil || smtpErr != nil || fromErr != nil || from.Address != os.Getenv("SMTP_FROM") {
			logger.Error("production requires an HTTPS PUBLIC_ORIGIN and configured SMTP delivery")
			os.Exit(1)
		}
	}
	config := api.Config{
		AppEnv:           appEnv,
		AuthOTPPepper:    []byte(os.Getenv("AUTH_OTP_PEPPER")),
		MFAEncryptionKey: mfaKey,
		SMTPAddress:      os.Getenv("SMTP_ADDR"),
		SMTPUsername:     os.Getenv("SMTP_USERNAME"),
		SMTPPassword:     os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:         os.Getenv("SMTP_FROM"),
		PublicOrigin:     os.Getenv("PUBLIC_ORIGIN"),
		SecureCookies:    appEnv != "development",
		DevelopmentCode:  appEnv == "development" && isLoopbackAddress(address),
		TrustedProxyCIDRs: trustedProxyCIDRs,
	}

	mux := http.NewServeMux()
	apiHandler := api.New(db, config, logger)
	mux.Handle("/api/", apiHandler)
	mux.Handle("GET /healthz", apiHandler)
	staticHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setStaticSecurityHeaders(w)
		files := map[string]string{
			"/": "index.html", "/index.html": "index.html", "/styles.css": "styles.css",
			"/main.js": "main.js", "/site-config.js": "site-config.js", "/demo.html": "demo.html",
			"/demo.css": "demo.css", "/demo.js": "demo.js",
		}
		name, ok := files[r.URL.Path]
		if !ok {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(webRoot, name))
	})
	staticPaths := []string{"/", "/index.html", "/styles.css", "/main.js", "/site-config.js", "/demo.html", "/demo.css", "/demo.js"}
	for _, path := range staticPaths {
		pattern := "GET " + path
		if path == "/" {
			pattern = "GET /{$}"
		}
		mux.Handle(pattern, staticHandler)
	}
	server := &http.Server{Addr: address, Handler: mux, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	logger.Info("API server starting", "address", address, "database_configured", db != nil, "app_env", appEnv)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("API server stopped", "reason", "listen_failed")
		os.Exit(1)
	}
}

func parseTrustedProxyCIDRs(value string) ([]netip.Prefix, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	parts := strings.Split(value, ",")
	prefixes := make([]netip.Prefix, 0, len(parts))
	for _, part := range parts {
		prefix, err := netip.ParsePrefix(strings.TrimSpace(part))
		if err != nil {
			return nil, err
		}
		if prefix.Bits() == 0 {
			return nil, errors.New("trusting an entire address family is not allowed")
		}
		prefixes = append(prefixes, prefix.Masked())
	}
	return prefixes, nil
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func isLoopbackAddress(address string) bool {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return false
	}
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func setStaticSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
}
