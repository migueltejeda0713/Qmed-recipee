package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"Qmed-Recipe/middleware"
)

func TestAuthMe_NoContextDoctorID_Returns401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/auth/me", nil)
	AuthMe(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestAuthMe_WithContextDoctorID_AttemptsLookup(t *testing.T) {
	ctx := context.WithValue(context.Background(), middleware.DoctorIDKey, "fake-uuid")
	req := httptest.NewRequest("GET", "/api/auth/me", nil).WithContext(ctx)
	rec := httptest.NewRecorder()
	AuthMe(rec, req)
	if rec.Code == http.StatusUnauthorized {
		t.Errorf("did not look up doctor — id was in ctx, expected !=401, got %d", rec.Code)
	}
}
