package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAuthLogout_NoCookies_ClearsAndReturns200(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/logout", nil)
	AuthLogout(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	headers := rec.Header().Values("Set-Cookie")
	if len(headers) < 3 {
		t.Errorf("expected 3 Set-Cookie headers (clearing all), got %d", len(headers))
	}
	for _, h := range headers {
		if !strings.Contains(h, "Max-Age=0") {
			t.Errorf("expected Max-Age=0 in cookie: %s", h)
		}
	}
}
