package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func LoginDoctor(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var creds models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	database := db.InitDB()
	defer database.Close()

	var idBytes []byte
	var storedHash string
	err := database.QueryRow(`
		SELECT BIN_TO_UUID(id_doctor, TRUE), password FROM doctor
		WHERE email = ?`,
		creds.Email,
	).Scan(&idBytes, &storedHash)

	if err == sql.ErrNoRows {
		bcrypt.CompareHashAndPassword([]byte("$2a$12$dummyhashfortimingnoop000000000000000000000000000000000"), []byte(creds.Password))
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Login query error: %v", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(creds.Password)); err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	jwt, err := middleware.GenerateJWT(creds.Email)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    jwt,
		HttpOnly: true,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		MaxAge:   86400,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      string(idBytes),
		"email":   creds.Email,
	})
}
