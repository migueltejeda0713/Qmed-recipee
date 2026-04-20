package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func parsePag(r *http.Request) (int, int) {
	page, size := defaultPage, defaultPageSize
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			size = v
		}
	}
	return page, size
}

func GetComponentesPaginados(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	page, limit := parsePag(r)
	offset := (page - 1) * limit

	dbConn := db.InitDB()
	defer dbConn.Close()

	query := `
		SELECT BIN_TO_UUID(id_component, TRUE), name
		FROM component
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`
	rows, err := dbConn.Query(query, limit, offset)
	if err != nil {
		log.Printf("Error listing components: %v\n", err)
		http.Error(w, "Error querying components", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	comps := []models.Component{}
	for rows.Next() {
		var c models.Component
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			log.Printf("Scan error: %v\n", err)
			continue
		}
		comps = append(comps, c)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{"data": comps}); err != nil {
		log.Printf("Error encoding JSON: %v\n", err)
	}
}
