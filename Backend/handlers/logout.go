package handlers

import "net/http"

// LogoutDoctor is a backward-compatible alias for AuthLogout.
func LogoutDoctor(w http.ResponseWriter, r *http.Request) {
	AuthLogout(w, r)
}
