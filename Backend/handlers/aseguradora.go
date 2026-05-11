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

	rows, err := database.Query("SELECT BIN_TO_UUID(id_provider, TRUE), provider_name FROM insurance_provider")
	if err != nil {
		serverError(w, "query_insurance_providers", err)
		return
	}
	defer rows.Close()

	providers := []models.InsuranceProvider{}
	for rows.Next() {
		var p models.InsuranceProvider
		if err := rows.Scan(&p.ID, &p.Name); err != nil {
			serverError(w, "scan_insurance_provider", err)
			return
		}
		providers = append(providers, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": providers})
}
