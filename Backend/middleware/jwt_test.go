package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestValidateJWT_MissingCookie_Returns401(t *testing.T) {
	handler := ValidateJWT(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestValidateJWT_ExpiredToken_SetsWWWAuthHeader(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))

	// Token already expired (1 hour ago, beyond the 30s leeway).
	claims := jwt.MapClaims{
		"sub":   "doc",
		"email": "e@x.com",
		"exp":   jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := tok.SignedString(jwtSecret)

	handler := ValidateJWT(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: signed})
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	auth := rec.Header().Get("WWW-Authenticate")
	if auth == "" || !strings.Contains(auth, "token_expired") {
		t.Errorf("expected WWW-Authenticate with token_expired, got %q", auth)
	}
}
