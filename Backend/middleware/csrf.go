package middleware

import (
	"crypto/subtle"
	"log"
	"net/http"
)

func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}

		cookie, err := r.Cookie("csrf_token")
		header := r.Header.Get("X-CSRF-Token")
		if err != nil || header == "" {
			log.Printf("[middleware/csrf] missing token cookie_err=%v header_present=%t path=%s",
				err, header != "", r.URL.Path)
			writeMWError(w, http.StatusForbidden, "csrf_missing",
				"Falta el token CSRF; recarga la página")
			return
		}
		if subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(header)) != 1 {
			log.Printf("[middleware/csrf] mismatch path=%s", r.URL.Path)
			writeMWError(w, http.StatusForbidden, "csrf_invalid",
				"Token CSRF inválido; recarga la página")
			return
		}
		next.ServeHTTP(w, r)
	})
}
