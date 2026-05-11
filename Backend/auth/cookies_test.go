package auth

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestSetAuthCookies_AllThreeCookiesPresent(t *testing.T) {
	os.Setenv("APP_ENV", "production")
	rec := httptest.NewRecorder()
	SetAuthCookies(rec, "access.jwt.value", "refresh-opaque-value", "csrf-random")

	cookies := rec.Result().Cookies()
	names := map[string]*http.Cookie{}
	for _, c := range cookies {
		names[c.Name] = c
	}

	if names["access_token"] == nil || names["refresh_token"] == nil || names["csrf_token"] == nil {
		t.Fatalf("missing cookies, got: %v", names)
	}
	if !names["access_token"].HttpOnly {
		t.Error("access_token must be HttpOnly")
	}
	if !names["refresh_token"].HttpOnly {
		t.Error("refresh_token must be HttpOnly")
	}
	if names["csrf_token"].HttpOnly {
		t.Error("csrf_token must NOT be HttpOnly (frontend needs to read it)")
	}
	if !names["access_token"].Secure {
		t.Error("Secure must be true in production")
	}
	if names["refresh_token"].Path != "/api/auth" {
		t.Errorf("refresh_token path must be /api/auth, got %s", names["refresh_token"].Path)
	}
	if names["access_token"].SameSite != http.SameSiteStrictMode {
		t.Error("SameSite must be Strict")
	}
}

func TestClearAuthCookies_AllExpired(t *testing.T) {
	rec := httptest.NewRecorder()
	ClearAuthCookies(rec)
	got := strings.Join(rec.Header().Values("Set-Cookie"), "\n")
	for _, name := range []string{"access_token", "refresh_token", "csrf_token"} {
		if !strings.Contains(got, name+"=") {
			t.Errorf("missing clear for %s in %s", name, got)
		}
	}
	if !strings.Contains(got, "Max-Age=0") {
		t.Errorf("expected Max-Age=0 in headers: %s", got)
	}
}
