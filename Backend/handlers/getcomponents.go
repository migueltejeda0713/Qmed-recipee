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

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	page, limit := parsePag(r)
	offset := (page - 1) * limit

	dbConn := db.InitDB()
	defer dbConn.Close()

	query := `
		SELECT id_componente, nombre
		FROM componentes
		ORDER BY id_componente DESC
		LIMIT ? OFFSET ?
	`
	rows, err := dbConn.Query(query, limit, offset)
	if err != nil {
		log.Printf("Error listando componentes: %v\n", err)
		http.Error(w, "Error consultando componentes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var comps []models.Componente
	for rows.Next() {
		var c models.Componente
		if err := rows.Scan(&c.ID, &c.Nombre); err != nil {
			log.Printf("Scan error: %v\n", err)
			continue
		}
		comps = append(comps, c)
	}

	if err := json.NewEncoder(w).Encode(comps); err != nil {
		log.Printf("Error encoding JSON: %v\n", err)
	}
}
