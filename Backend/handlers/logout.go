package handlers

import (
	"net/http"
	"os"
)

func LogoutDoctor(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		HttpOnly: true,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		MaxAge:   -1,
	})

	w.WriteHeader(http.StatusOK)
}
