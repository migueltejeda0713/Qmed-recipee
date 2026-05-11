package handlers

import "net/http"

// LoginDoctor is a transitional alias for AuthLogin. Remove after frontend
// migration to /api/auth/login is complete.
func LoginDoctor(w http.ResponseWriter, r *http.Request) {
	AuthLogin(w, r)
}
