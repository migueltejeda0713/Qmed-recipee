package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
)

func SearchMedicamento(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	q := r.URL.Query().Get("name")
	limitQ := r.URL.Query().Get("limit")

	baseQuery := `
		SELECT
			BIN_TO_UUID(m.id_medicine, TRUE),
			m.medicine_name,
			c.name,
			l.laboratory_name
		FROM medicine m
		JOIN component c ON m.id_component = c.id_component
		JOIN laboratory l ON m.id_laboratory = l.id_laboratory
		WHERE m.row_status_id = 2
	`
	var args []interface{}
	if q != "" {
		baseQuery += " AND m.medicine_name LIKE ?"
		args = append(args, "%"+q+"%")
	}
	baseQuery += " ORDER BY m.created_at DESC"

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
		log.Println("Search medicine error:", err)
		http.Error(w, "Error executing search", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	medicines := []MedicineResponse{}
	for rows.Next() {
		var m MedicineResponse
		if err := rows.Scan(&m.ID, &m.MedicineName, &m.ComponentName, &m.LaboratoryName); err != nil {
			log.Println("Error scanning:", err)
			continue
		}
		medicines = append(medicines, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": medicines})
}
