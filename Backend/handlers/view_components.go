// handlers/component_handler.go
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)

func GetComponentes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	rows, err := db.DB.Query("SELECT BIN_TO_UUID(id_component, TRUE), name FROM component ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset)
	if err != nil {
		http.Error(w, "Error getting components", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var components []models.Component
	for rows.Next() {
		var c models.Component
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			http.Error(w, "Error parsing component", http.StatusInternalServerError)
			return
		}
		components = append(components, c)
	}

	json.NewEncoder(w).Encode(components)
}
