package handlers

import (
	"encoding/json"
	"net/http"

	"Qmed-Recipe/auth"
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

// AuthLogout revokes the active refresh token (if present) and clears all auth
// cookies. It tolerates a nil DB (e.g. in tests) by simply clearing cookies.
func AuthLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if cookie, err := r.Cookie("refresh_token"); err == nil {
		database := db.DB
		if database != nil {
			hash := auth.HashToken(cookie.Value)
			if row, err := auth.FindRefreshByHash(database, hash); err == nil {
				_ = auth.RevokeToken(database, row.IDToken)
				_ = auth.InsertAudit(database, &models.AuditEvent{
					IDDoctor:   &row.IDDoctor,
					EmailTried: "",
					EventType:  models.AuditLogout,
					IP:         clientIP(r),
					UserAgent:  r.Header.Get("User-Agent"),
				})
			}
		}
	}

	auth.ClearAuthCookies(w)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
