package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCSRF_SafeMethodPassesThrough(t *testing.T) {
	called := false
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true }))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	h.ServeHTTP(rec, req)
	if !called {
		t.Error("GET should not be blocked by CSRF")
	}
}

func TestCSRF_PostMissingHeader_Returns403(t *testing.T) {
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "csrf_missing") {
		t.Errorf("expected csrf_missing body, got: %s", rec.Body.String())
	}
}

func TestCSRF_PostMismatch_Returns403(t *testing.T) {
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	req.Header.Set("X-CSRF-Token", "xyz")
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}

func TestCSRF_PostMatch_PassesThrough(t *testing.T) {
	called := false
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true }))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc123"})
	req.Header.Set("X-CSRF-Token", "abc123")
	h.ServeHTTP(rec, req)
	if !called {
		t.Error("matching CSRF should pass through")
	}
}
