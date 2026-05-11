package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestAuthLogin_BadJSON_Returns400(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBufferString("{bad"))
	AuthLogin(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestAuthLogin_MissingEmail_Returns401Generic(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	body, _ := json.Marshal(map[string]string{"email": "", "password": "x"})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
	AuthLogin(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "invalid_credentials") {
		t.Errorf("expected invalid_credentials, got: %s", rec.Body.String())
	}
}
