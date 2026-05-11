package handlers

import (
	"encoding/json"
	"net/http"

	"Qmed-Recipe/db"
)

type MedicineResponse struct {
	ID             string `json:"id_medicine"`
	MedicineName   string `json:"medicine_name"`
	ComponentName  string `json:"component_name"`
	LaboratoryName string `json:"laboratory_name"`
}

func GetMedicamentos(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		clientError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Método HTTP no permitido")
		return
	}

	page, limit := parsePag(r)
	offset := (page - 1) * limit

	dbConn := db.InitDB()

	query := `
		SELECT
			BIN_TO_UUID(m.id_medicine, TRUE),
			m.medicine_name,
			c.name,
			l.laboratory_name
		FROM medicine m
		JOIN component c ON m.id_component = c.id_component
		JOIN laboratory l ON m.id_laboratory = l.id_laboratory
		WHERE m.row_status_id = 2
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := dbConn.Query(query, limit, offset)
	if err != nil {
		serverError(w, "query_medicines", err)
		return
	}
	defer rows.Close()

	medicines := []MedicineResponse{}

	for rows.Next() {
		var m MedicineResponse
		if err := rows.Scan(&m.ID, &m.MedicineName, &m.ComponentName, &m.LaboratoryName); err != nil {
			serverError(w, "scan_medicine", err)
			return
		}
		medicines = append(medicines, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": medicines})
}
