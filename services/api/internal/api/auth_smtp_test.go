package api

import (
	"bufio"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"strings"
	"testing"
	"time"
)

func TestSendCodeUsesValidatedSTARTTLS(t *testing.T) {
	relay := startTestSMTPRelay(t, true, false)
	server := &Server{config: Config{
		SMTPAddress: relay.address,
		SMTPFrom:    "signin@example.test",
		SMTPRootCAs: relay.roots,
	}, smtpDial: relay.dial}

	if err := server.sendCode("applicant@example.test", "123456"); err != nil {
		t.Fatalf("sendCode() error = %v", err)
	}

	select {
	case message := <-relay.message:
		if !strings.Contains(message, "To: applicant@example.test\r\n") {
			t.Fatalf("message missing synthetic recipient: %q", message)
		}
		if !strings.Contains(message, "Your sign-in code is 123456.") {
			t.Fatalf("message missing code body: %q", message)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("relay did not receive a message")
	}
}

func TestSendCodeRejectsRelayWithoutSTARTTLS(t *testing.T) {
	relay := startTestSMTPRelay(t, false, false)
	server := &Server{config: Config{SMTPAddress: relay.address, SMTPFrom: "signin@example.test"}, smtpDial: relay.dial}

	if err := server.sendCode("applicant@example.test", "123456"); err == nil || !strings.Contains(err.Error(), "STARTTLS") {
		t.Fatalf("sendCode() error = %v, want STARTTLS rejection", err)
	}
}

func TestSendCodeReturnsRecipientRejection(t *testing.T) {
	relay := startTestSMTPRelay(t, true, true)
	server := &Server{config: Config{SMTPAddress: relay.address, SMTPFrom: "signin@example.test", SMTPRootCAs: relay.roots}, smtpDial: relay.dial}

	if err := server.sendCode("applicant@example.test", "123456"); err == nil || !strings.Contains(err.Error(), "recipient") {
		t.Fatalf("sendCode() error = %v, want recipient rejection", err)
	}
}

type testSMTPRelay struct {
	address string
	roots   *x509.CertPool
	message chan string
	dial    func(network, address string) (net.Conn, error)
}

func startTestSMTPRelay(t *testing.T, startTLS, rejectRecipient bool) testSMTPRelay {
	t.Helper()
	cert, roots := testSMTPIdentity(t)
	relay := testSMTPRelay{address: "smtp.example.test:2525", roots: roots, message: make(chan string, 1)}
	relay.dial = func(_, _ string) (net.Conn, error) {
		clientConn, serverConn := net.Pipe()
		go serveTestSMTPRelay(serverConn, cert, startTLS, rejectRecipient, relay.message)
		return clientConn, nil
	}
	return relay
}

func serveTestSMTPRelay(conn net.Conn, cert tls.Certificate, startTLS, rejectRecipient bool, message chan string) {
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
	if !smtpReply(conn, "220 local test relay") {
		return
	}
	reader := bufio.NewReader(conn)
	line, readErr := reader.ReadString('\n')
	if readErr != nil || !strings.HasPrefix(strings.ToUpper(line), "EHLO ") {
		return
	}
	if startTLS {
		if !smtpReply(conn, "250-local test relay\r\n250-STARTTLS\r\n250 SIZE 100000") {
			return
		}
	} else if !smtpReply(conn, "250-local test relay\r\n250 SIZE 100000") {
		return
	}
	if !startTLS {
		return
	}
	line, readErr = reader.ReadString('\n')
	if readErr != nil || strings.TrimSpace(strings.ToUpper(line)) != "STARTTLS" {
		return
	}
	if !smtpReply(conn, "220 begin TLS") {
		return
	}
	secured := tls.Server(conn, &tls.Config{Certificates: []tls.Certificate{cert}, MinVersion: tls.VersionTLS12})
	if secured.Handshake() != nil {
		return
	}
	reader = bufio.NewReader(secured)
	for {
		line, readErr = reader.ReadString('\n')
		if readErr != nil {
			return
		}
		command := strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(strings.ToUpper(command), "EHLO "):
			if !smtpReply(secured, "250-local test relay\r\n250 SIZE 100000") {
				return
			}
		case strings.HasPrefix(strings.ToUpper(command), "MAIL FROM:"):
			if !smtpReply(secured, "250 sender accepted") {
				return
			}
		case strings.HasPrefix(strings.ToUpper(command), "RCPT TO:"):
			if rejectRecipient {
				if !smtpReply(secured, "550 recipient rejected") {
					return
				}
				return
			}
			if !smtpReply(secured, "250 recipient accepted") {
				return
			}
		case strings.EqualFold(command, "DATA"):
			if !smtpReply(secured, "354 end with dot") {
				return
			}
			var body strings.Builder
			for {
				line, readErr = reader.ReadString('\n')
				if readErr != nil {
					return
				}
				if line == ".\r\n" {
					break
				}
				body.WriteString(line)
			}
			message <- body.String()
			if !smtpReply(secured, "250 queued") {
				return
			}
		case strings.EqualFold(command, "QUIT"):
			if !smtpReply(secured, "221 bye") {
				return
			}
			_, _ = secured.Read(make([]byte, 1))
			return
		default:
			_ = smtpReply(secured, "500 unsupported command")
			return
		}
	}
}

func testSMTPIdentity(t *testing.T) (tls.Certificate, *x509.CertPool) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		t.Fatal(err)
	}
	template := x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: "smtp.example.test"},
		NotBefore:    time.Now().Add(-time.Minute),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:     []string{"smtp.example.test"},
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	cert, err := tls.X509KeyPair(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}))
	if err != nil {
		t.Fatal(err)
	}
	roots := x509.NewCertPool()
	parsed, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatal(err)
	}
	roots.AddCert(parsed)
	return cert, roots
}

func smtpReply(conn net.Conn, reply string) bool {
	_, err := fmt.Fprintf(conn, "%s\r\n", reply)
	return err == nil
}
