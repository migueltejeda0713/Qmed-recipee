// handlers/searchComponente.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func SearchComponente(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		log.Println("OPTIONS at /api/searchcomponente")
		w.WriteHeader(http.StatusOK)
		return
	}

	q := r.URL.Query().Get("q")
	limitQ := r.URL.Query().Get("limit")

	baseQuery := `
		SELECT BIN_TO_UUID(id_component, TRUE), name
		FROM component
		WHERE row_status_id = 2
	`
	var args []interface{}
	if q != "" {
		baseQuery += " AND name LIKE ?"
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

	rows, err := dbConn.Query(baseQuery, args...)
	if err != nil {
		serverError(w, "search_components_query", err)
		return
	}
	defer rows.Close()

	comps := []models.Component{}
	for rows.Next() {
		var c models.Component
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			log.Printf("Error scanning: %v\n", err)
			continue
		}
		comps = append(comps, c)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{"data": comps}); err != nil {
		log.Printf("Error encoding JSON: %v\n", err)
	}
}
