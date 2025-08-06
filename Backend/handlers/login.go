// reemplaza completamente el archivo
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
		http.Error(w, "JSON inválido: "+err.Error(), http.StatusBadRequest)
		return
	}

	database := db.InitDB()
	defer database.Close()

	var id int
	err := database.QueryRow(`
		SELECT id_doctor FROM doctor 
		WHERE correo = ? AND password = ?`,
		creds.Correo, creds.Password,
	).Scan(&id)

	if err == sql.ErrNoRows {
		http.Error(w, "Correo o contraseña incorrectos", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Error en consulta login: %v", err)
		http.Error(w, "Error en servidor ", http.StatusInternalServerError,)
		return
	}

	jwt, err := middleware.GenerateJWT(creds.Correo)
	if err != nil {
		http.Error(w, "Error generando token", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"token":   jwt,
		"id":      id,
		"correo":  creds.Correo,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
