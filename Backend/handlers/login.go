package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

func LoginDoctor(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var creds models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	database := db.InitDB()
	defer database.Close()

	var idBytes []byte
	err := database.QueryRow(`
		SELECT BIN_TO_UUID(id_doctor, TRUE) FROM doctor
		WHERE email = ? AND password = ?`,
		creds.Email, creds.Password,
	).Scan(&idBytes)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Login query error: %v", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	jwt, err := middleware.GenerateJWT(creds.Email)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"token":   jwt,
		"id":      string(idBytes),
		"email":   creds.Email,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
