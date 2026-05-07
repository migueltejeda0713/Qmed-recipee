package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func GetLaboratoriosPaginados(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	page, limit := parsePag(r)
	offset := (page - 1) * limit

	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(`
		SELECT BIN_TO_UUID(id_laboratory, TRUE), laboratory_name
		FROM laboratory
		WHERE row_status_id = 2
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		log.Printf("Error listing laboratories: %v\n", err)
		http.Error(w, "Error querying laboratories", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	labs := []models.Laboratory{}
	for rows.Next() {
		var l models.Laboratory
		if err := rows.Scan(&l.ID, &l.Name); err != nil {
			log.Printf("Scan error laboratory: %v\n", err)
			continue
		}
		labs = append(labs, l)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{"data": labs}); err != nil {
		log.Printf("Error encoding laboratories JSON: %v\n", err)
	}
}
