// handlers/Getlaboratorios.go
package handlers

import (
	"Qmed-Recipe/db"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

type Laboratorio struct {
	ID     int64  `json:"id_laboratorio"`
	Nombre string `json:"nombre_laboratorio"`
}

func GetLaboratorios(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

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

	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(
		"SELECT id_laboratorio, nombre_laboratorio FROM laboratorios ORDER BY id_laboratorio DESC LIMIT ?, ?",
		offset, limit,
	)
	if err != nil {
		log.Println("Error al consultar laboratorios:", err)
		http.Error(w, "Error al obtener laboratorios", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	laboratorios := []Laboratorio{}
	for rows.Next() {
		var lab Laboratorio
		if err := rows.Scan(&lab.ID, &lab.Nombre); err != nil {
			log.Println("Error al escanear laboratorio:", err)
			continue
		}
		laboratorios = append(laboratorios, lab)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(laboratorios)
}