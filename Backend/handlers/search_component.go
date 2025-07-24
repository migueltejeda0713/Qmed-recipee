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

// SearchComponente busca componentes por nombre (LIKE)
func SearchComponente(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		log.Println("OPTIONS en /api/searchcomponente")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Parámetros de búsqueda y límite
	q := r.URL.Query().Get("q")
	limitQ := r.URL.Query().Get("limit")

	// Consulta sólo con id_componente y nombre
	baseQuery := `
		SELECT id_componente, nombre
		FROM componentes
	`
	var args []interface{}
	if q != "" {
		baseQuery += " WHERE nombre LIKE ?"
		args = append(args, "%"+q+"%")
	}
	baseQuery += " ORDER BY id_componente DESC"

	if limitQ != "" {
		if lim, err := strconv.Atoi(limitQ); err == nil && lim > 0 {
			baseQuery += " LIMIT ?"
			args = append(args, lim)
		} else {
			log.Printf("limit inválido: %s\n", limitQ)
		}
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(baseQuery, args...)
	if err != nil {
		log.Printf("Error en búsqueda: %v\n", err)
		http.Error(w, "Error ejecutando búsqueda", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Escaneo directo a struct sin DoctorID
	var comps []models.Componente
	for rows.Next() {
		var c models.Componente
		if err := rows.Scan(&c.ID, &c.Nombre); err != nil {
			log.Printf("Error escaneando: %v\n", err)
			continue
		}
		comps = append(comps, c)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(comps); err != nil {
		log.Printf("Error encoding JSON: %v\n", err)
	}
}
