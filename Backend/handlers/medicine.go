// handlers/createMedicamento.go
package handlers

import (
	"Qmed-Recipe/db"
	"encoding/json"
	"log"
	"net/http"
)

type createMedRequest struct {
	Name         string `json:"medicine_name"`
	IDComponent  string `json:"id_component"`
	IDLaboratory string `json:"id_laboratory"`
}

func CreateMedicamento(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req createMedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Invalid JSON:", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	_, err := dbConn.Exec(
		`INSERT INTO medicine (medicine_name, id_component, id_laboratory)
		 VALUES (?, UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE))`,
		req.Name, req.IDComponent, req.IDLaboratory,
	)
	if err != nil {
		log.Println("Error inserting medicine:", err)
		http.Error(w, "Error creating medicine", http.StatusInternalServerError)
		return
	}

	var id string
	err = dbConn.QueryRow("SELECT BIN_TO_UUID(id_medicine, TRUE) FROM medicine ORDER BY created_at DESC LIMIT 1").Scan(&id)
	if err != nil {
		log.Println("Error getting medicine id:", err)
		http.Error(w, "Error getting medicine id", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_medicine":   id,
		"medicine_name": req.Name,
		"id_component":  req.IDComponent,
		"id_laboratory": req.IDLaboratory,
	})
}
