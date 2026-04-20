package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
	"github.com/google/uuid"
)

type createComponentRequest struct {
	Name string `json:"name"`
}

func CreateComponente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req createComponentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Invalid JSON:", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	id := uuid.New().String()

	dbConn := db.InitDB()
	defer dbConn.Close()

	_, err := dbConn.Exec(
		`INSERT INTO component (id_component, name) VALUES (UUID_TO_BIN(?, TRUE), ?)`,
		id, req.Name,
	)
	if err != nil {
		log.Println("Error inserting component:", err)
		http.Error(w, "Error creating component", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_component": id,
		"name":         req.Name,
	})
}
