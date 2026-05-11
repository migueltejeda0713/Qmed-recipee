package auth

import (
	"net/http"
	"os"
	"time"
)

func isSecure() bool {
	return os.Getenv("APP_ENV") == "production"
}

// sameSiteMode picks the right SameSite policy per environment:
//   - production: Strict (frontend and API live on the same site).
//   - dev: Lax — Strict blocks cookies on cross-origin XHR responses in some
//     browsers when frontend (vite :5173) and API (:5174) run on different
//     origins, leaving `document.cookie` empty so the CSRF interceptor has
//     nothing to send.
func sameSiteMode() http.SameSite {
	if isSecure() {
		return http.SameSiteStrictMode
	}
	return http.SameSiteLaxMode
}

func SetAuthCookies(w http.ResponseWriter, access, refresh, csrf string) {
	secure := isSecure()
	ss := sameSiteMode()

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    access,
		HttpOnly: true,
		Secure:   secure,
		SameSite: ss,
		Path:     "/",
		MaxAge:   int(accessTTL().Seconds()),
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refresh,
		HttpOnly: true,
		Secure:   secure,
		SameSite: ss,
		Path:     "/api/auth",
		MaxAge:   int(RefreshTTL().Seconds()),
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    csrf,
		HttpOnly: false,
		Secure:   secure,
		SameSite: ss,
		Path:     "/",
		MaxAge:   int(RefreshTTL().Seconds()),
	})
}

func ClearAuthCookies(w http.ResponseWriter) {
	secure := isSecure()
	paths := map[string]string{
		"access_token":  "/",
		"refresh_token": "/api/auth",
		"csrf_token":    "/",
	}
	for name, path := range paths {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			HttpOnly: name != "csrf_token",
			Secure:   secure,
			SameSite: sameSiteMode(),
			Path:     path,
			MaxAge:   -1,
			Expires:  time.Unix(0, 0),
		})
	}
}
