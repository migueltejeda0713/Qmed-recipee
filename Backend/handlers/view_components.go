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

	rows, err := db.DB.Query("SELECT id_componente, nombre FROM componente ORDER BY id_componente DESC LIMIT ? OFFSET ?", limit, offset)
	if err != nil {
		http.Error(w, "Error al obtener componentes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var componentes []models.Componente
	for rows.Next() {
		var c models.Componente
		if err := rows.Scan(&c.ID, &c.Nombre); err != nil {
			http.Error(w, "Error al parsear componente", http.StatusInternalServerError)
			return
		}
		componentes = append(componentes, c)
	}

	json.NewEncoder(w).Encode(componentes)
}
