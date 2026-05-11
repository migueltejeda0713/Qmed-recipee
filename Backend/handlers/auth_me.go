package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
)

// AuthMe returns the authenticated doctor's profile. It expects
// middleware.DoctorIDKey to be set in the request context (by the JWT
// middleware). Without it, returns 401.
func AuthMe(w http.ResponseWriter, r *http.Request) {
	idDoctor, _ := r.Context().Value(middleware.DoctorIDKey).(string)
	if idDoctor == "" {
		writeAuthError(w, http.StatusUnauthorized, "missing_token", 0)
		return
	}

	database := db.DB
	if database == nil {
		// In test environments (or before InitDB has run) we don't attempt to
		// call db.InitDB() because that path log.Fatal's on missing env.
		log.Printf("AuthMe: db.DB is nil")
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	var resp models.MeResponse
	var specialty sql.NullString
	err := database.QueryRow(`
		SELECT BIN_TO_UUID(id_doctor, TRUE), email, name, specialty
		FROM doctor WHERE id_doctor = UUID_TO_BIN(?, TRUE)`,
		idDoctor,
	).Scan(&resp.IDDoctor, &resp.Email, &resp.Name, &specialty)
	if err == sql.ErrNoRows {
		writeAuthError(w, http.StatusUnauthorized, "account_not_found", 0)
		return
	}
	if err != nil {
		log.Printf("AuthMe: doctor lookup err=%v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}
	if specialty.Valid {
		resp.Specialty = specialty.String
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
