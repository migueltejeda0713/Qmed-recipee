package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func SearchPacient(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		log.Println("OPTIONS request received at /api/searchpacient")
		w.WriteHeader(http.StatusOK)
		return
	}

	nameQ := r.URL.Query().Get("name")
	limitQ := r.URL.Query().Get("limit")

	baseQuery := `
		SELECT BIN_TO_UUID(id_patient, TRUE), name, birth_date, document_id, phone
		FROM patient
	`
	var args []interface{}

	if nameQ != "" {
		baseQuery += " WHERE MATCH(name) AGAINST (? IN NATURAL LANGUAGE MODE)"
		args = append(args, nameQ)
	}

	baseQuery += " ORDER BY created_at DESC"

	if limitQ != "" {
		if lim, err := strconv.Atoi(limitQ); err == nil && lim > 0 {
			baseQuery += " LIMIT ?"
			args = append(args, lim)
		} else {
			log.Printf("Invalid 'limit' parameter: %s\n", limitQ)
		}
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(baseQuery, args...)
	if err != nil {
		log.Printf("Error executing query: %v\n", err)
		http.Error(w, "Error executing query: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var patients []models.PatientSearchResult
	for rows.Next() {
		var p models.PatientSearchResult
		var phoneNull *string

		if err := rows.Scan(&p.ID, &p.Name, &p.BirthDate, &p.DocumentID, &phoneNull); err != nil {
			log.Printf("Error scanning row: %v\n", err)
			http.Error(w, "Error scanning results: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if phoneNull != nil {
			p.Phone = *phoneNull
		} else {
			p.Phone = ""
		}

		patients = append(patients, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patients)
}
