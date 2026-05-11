package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateAccessJWT_ContainsClaims(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	tok, err := GenerateAccessJWT("11111111-1111-1111-1111-111111111111", "doc@x.com")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	parsed, err := jwt.Parse(tok, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("token not valid: %v", err)
	}
	claims := parsed.Claims.(jwt.MapClaims)
	if claims["sub"] != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("sub mismatch: %v", claims["sub"])
	}
	if claims["email"] != "doc@x.com" {
		t.Errorf("email mismatch: %v", claims["email"])
	}
	if _, ok := claims["jti"]; !ok {
		t.Error("missing jti")
	}
}

func TestGenerateRandomToken_Length(t *testing.T) {
	tok, err := GenerateRandomToken(32)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(tok) < 40 {
		t.Errorf("token too short: %d", len(tok))
	}
	if strings.ContainsAny(tok, "+/=") {
		t.Errorf("expected url-safe b64, got: %s", tok)
	}
}

func TestHashToken_Stable(t *testing.T) {
	h1 := HashToken("abc")
	h2 := HashToken("abc")
	if h1 != h2 {
		t.Error("hash not stable")
	}
	if len(h1) != hex.EncodedLen(sha256.Size) {
		t.Errorf("expected %d chars, got %d", hex.EncodedLen(sha256.Size), len(h1))
	}
}

func TestAccessTokenTTL_DefaultsTo15Min(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	os.Unsetenv("JWT_ACCESS_MINUTES")
	tok, _ := GenerateAccessJWT("u", "e")
	parsed, _ := jwt.Parse(tok, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	claims := parsed.Claims.(jwt.MapClaims)
	exp := int64(claims["exp"].(float64))
	delta := time.Unix(exp, 0).Sub(time.Now())
	if delta < 14*time.Minute || delta > 16*time.Minute {
		t.Errorf("expected ~15min, got %v", delta)
	}
}
