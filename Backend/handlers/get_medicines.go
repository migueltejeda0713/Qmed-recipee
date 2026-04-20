package handlers

import (
	"encoding/json"
	"log"
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
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	query := `
		SELECT
			BIN_TO_UUID(m.id_medicine, TRUE),
			m.medicine_name,
			c.name,
			l.laboratory_name
		FROM medicine m
		JOIN component c ON m.id_component = c.id_component
		JOIN laboratory l ON m.id_laboratory = l.id_laboratory
		ORDER BY m.created_at DESC;
	`

	rows, err := dbConn.Query(query)
	if err != nil {
		log.Println("Error executing SELECT:", err)
		http.Error(w, "Error getting medicines", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	medicines := []MedicineResponse{}

	for rows.Next() {
		var m MedicineResponse
		if err := rows.Scan(&m.ID, &m.MedicineName, &m.ComponentName, &m.LaboratoryName); err != nil {
			log.Println("Error scanning row:", err)
			http.Error(w, "Error reading data", http.StatusInternalServerError)
			return
		}
		medicines = append(medicines, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": medicines})
}
