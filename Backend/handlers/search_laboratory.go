package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func SearchLaboratorio(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	q := r.URL.Query().Get("name")
	limitQ := r.URL.Query().Get("limit")

	baseQuery := `SELECT BIN_TO_UUID(id_laboratory, TRUE), laboratory_name FROM laboratory`
	var args []interface{}
	if q != "" {
		baseQuery += " WHERE laboratory_name LIKE ?"
		args = append(args, "%"+q+"%")
	}
	baseQuery += " ORDER BY created_at DESC"

	if limitQ != "" {
		if lim, err := strconv.Atoi(limitQ); err == nil && lim > 0 {
			baseQuery += " LIMIT ?"
			args = append(args, lim)
		} else {
			log.Printf("Invalid limit: %s\n", limitQ)
		}
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(baseQuery, args...)
	if err != nil {
		log.Printf("Search laboratory error: %v\n", err)
		http.Error(w, "Error executing search", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	labs := []models.Laboratory{}
	for rows.Next() {
		var l models.Laboratory
		if err := rows.Scan(&l.ID, &l.Name); err != nil {
			log.Printf("Error scanning: %v\n", err)
			continue
		}
		labs = append(labs, l)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{"data": labs}); err != nil {
		log.Printf("Error encoding JSON: %v\n", err)
	}
}
