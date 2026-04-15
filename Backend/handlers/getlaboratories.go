// handlers/getLaboratorios.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func GetLaboratorios(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(`
		SELECT BIN_TO_UUID(id_laboratory, TRUE), laboratory_name
		FROM laboratory
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("Error listing laboratories: %v\n", err)
		http.Error(w, "Error querying laboratories", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var labs []models.Laboratory
	for rows.Next() {
		var l models.Laboratory
		if err := rows.Scan(&l.ID, &l.Name); err != nil {
			log.Printf("Scan error laboratory: %v\n", err)
			continue
		}
		labs = append(labs, l)
	}

	if err := json.NewEncoder(w).Encode(labs); err != nil {
		log.Printf("Error encoding laboratories JSON: %v\n", err)
	}
}
