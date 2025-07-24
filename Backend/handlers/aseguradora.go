package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"encoding/json"
	"net/http"
)

func GetAseguradoras(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	database := db.InitDB()
	defer database.Close()

	rows, err := database.Query("SELECT id_seguro, nombre_aseguradora FROM aseguradoras")
	if err != nil {
		http.Error(w, "Error consultando aseguradoras: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var aseguradoras []models.Aseguradora
	for rows.Next() {
		var a models.Aseguradora
		if err := rows.Scan(&a.ID, &a.Nombre); err != nil {
			http.Error(w, "Error leyendo aseguradoras: "+err.Error(), http.StatusInternalServerError)
			return
		}
		aseguradoras = append(aseguradoras, a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(aseguradoras)
}
