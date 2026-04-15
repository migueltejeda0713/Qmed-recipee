package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
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

	dbConn := db.InitDB()
	defer dbConn.Close()

	_, err := dbConn.Exec(
		`INSERT INTO component (name) VALUES (?)`,
		req.Name,
	)
	if err != nil {
		log.Println("Error inserting component:", err)
		http.Error(w, "Error creating component", http.StatusInternalServerError)
		return
	}

	var id string
	err = dbConn.QueryRow("SELECT BIN_TO_UUID(id_component, TRUE) FROM component ORDER BY created_at DESC LIMIT 1").Scan(&id)
	if err != nil {
		log.Println("Error getting component id:", err)
		http.Error(w, "Error getting component id", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_component": id,
		"name":         req.Name,
	})
}
