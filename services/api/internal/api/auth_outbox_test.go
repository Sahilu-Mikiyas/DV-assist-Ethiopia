package api

import (
	"bytes"
	"testing"
)

func TestEmailOutboxPayloadEncryptionAuthenticatesEnvelope(t *testing.T) {
	server := &Server{config: Config{EmailOutboxEncryptionKey: bytes.Repeat([]byte("k"), 32)}}
	payload := emailOutboxPayload{Email: "synthetic@example.test", Code: "123456"}
	ciphertext, err := server.encryptEmailOutboxPayload("outbox-id", payload)
	if err != nil {
		t.Fatalf("encrypt outbox payload: %v", err)
	}
	got, err := server.decryptEmailOutboxPayload("outbox-id", ciphertext)
	if err != nil || got != payload {
		t.Fatalf("decrypt payload=%+v err=%v, want original payload", got, err)
	}
	if _, err := server.decryptEmailOutboxPayload("another-outbox-id", ciphertext); err == nil {
		t.Fatal("decrypt accepted a payload bound to another outbox row")
	}
	ciphertext[len(ciphertext)-1] ^= 0xff
	if _, err := server.decryptEmailOutboxPayload("outbox-id", ciphertext); err == nil {
		t.Fatal("decrypt accepted modified ciphertext")
	}
}
