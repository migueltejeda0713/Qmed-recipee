package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthRefresh_MissingCookie_Returns401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	AuthRefresh(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
