package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"Qmed-Recipe/auth"
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func refreshGrace() time.Duration {
	if v := os.Getenv("REFRESH_GRACE_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			return time.Duration(n) * time.Second
		}
	}
	return 2 * time.Second
}

func AuthRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}

	ip := clientIP(r)
	ua := r.Header.Get("User-Agent")
	database := db.DB
	if database == nil {
		database = db.InitDB()
	}

	hash := auth.HashToken(cookie.Value)
	row, err := auth.FindRefreshByHash(database, hash)
	if err == sql.ErrNoRows {
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}
	if err != nil {
		log.Printf("refresh lookup error: %v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	if row.RevokedAt != nil || row.ExpiresAt.Before(time.Now()) {
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}

	if row.UsedAt != nil {
		if time.Since(*row.UsedAt) > refreshGrace() {
			_ = auth.RevokeFamily(database, row.IDFamily)
			_ = auth.InsertAudit(database, &models.AuditEvent{
				IDDoctor: &row.IDDoctor, EmailTried: "",
				EventType: models.AuditRefreshReuse, IP: ip, UserAgent: ua,
			})
		}
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}

	var email string
	if err := database.QueryRow(
		`SELECT email FROM doctor WHERE id_doctor = UUID_TO_BIN(?, TRUE)`,
		row.IDDoctor,
	).Scan(&email); err != nil {
		log.Printf("AuthRefresh: doctor email lookup err=%v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	if err := auth.MarkRefreshUsed(database, row.IDToken); err != nil {
		log.Printf("mark used error: %v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	newRefresh, _ := auth.GenerateRandomToken(32)
	newAccess, _ := auth.GenerateAccessJWT(row.IDDoctor, email)
	newCSRF, _ := auth.GenerateRandomToken(32)

	if err := auth.InsertRefresh(database, row.IDDoctor, row.IDFamily,
		auth.HashToken(newRefresh),
		time.Now().Add(auth.RefreshTTL()), ua, ip); err != nil {
		log.Printf("AuthRefresh: InsertRefresh err=%v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	auth.SetAuthCookies(w, newAccess, newRefresh, newCSRF)
	_ = auth.InsertAudit(database, &models.AuditEvent{
		IDDoctor: &row.IDDoctor, EmailTried: email,
		EventType: models.AuditRefreshOK, IP: ip, UserAgent: ua,
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
