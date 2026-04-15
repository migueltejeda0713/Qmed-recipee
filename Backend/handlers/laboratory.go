// handlers/createLaboratorio.go
package handlers

import (
	"Qmed-Recipe/db"
	"encoding/json"
	"log"
	"net/http"
)

type createLabRequest struct {
	Name string `json:"laboratory_name"`
}

func CreateLaboratorio(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req createLabRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Invalid JSON:", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	_, err := dbConn.Exec(
		`INSERT INTO laboratory (laboratory_name) VALUES (?)`,
		req.Name,
	)
	if err != nil {
		log.Println("Error inserting laboratory:", err)
		http.Error(w, "Error creating laboratory", http.StatusInternalServerError)
		return
	}

	var id string
	err = dbConn.QueryRow("SELECT BIN_TO_UUID(id_laboratory, TRUE) FROM laboratory ORDER BY created_at DESC LIMIT 1").Scan(&id)
	if err != nil {
		log.Println("Error getting laboratory id:", err)
		http.Error(w, "Error getting laboratory id", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_laboratory": id,
		"name":          req.Name,
	})
}
