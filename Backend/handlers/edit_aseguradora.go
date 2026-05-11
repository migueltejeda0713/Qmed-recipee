package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type PolicyResponse struct {
	PolicyNumber string `json:"policy_number"`
	IDProvider   string `json:"id_provider"`
	ProviderName string `json:"provider_name"`
}

func GetPolizaByPaciente(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idPatient := vars["id"]

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		clientError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Método HTTP no permitido")
		return
	}

	email, _ := r.Context().Value(middleware.DoctorEmailKey).(string)

	dbConn := db.InitDB()

	query := `
		SELECT
			pol.policy_number,
			BIN_TO_UUID(pol.id_provider, TRUE),
			ip.provider_name
		FROM patient p
		LEFT JOIN insurance_policy pol ON p.id_policy = pol.id_policy
		LEFT JOIN insurance_provider ip ON pol.id_provider = ip.id_provider
		WHERE p.id_patient = UUID_TO_BIN(?, TRUE)
		  AND p.id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
	`
	var policyNumber sql.NullString
	var idProv sql.NullString
	var provName sql.NullString

	err := dbConn.QueryRow(query, idPatient, email).Scan(
		&policyNumber,
		&idProv,
		&provName,
	)
	if err == sql.ErrNoRows {
		clientError(w, http.StatusNotFound, "patient_not_found", "El paciente no existe o no pertenece a este médico")
		return
	}
	if err != nil {
		serverError(w, "query_policy_by_patient", err)
		return
	}

	resp := PolicyResponse{}
	if policyNumber.Valid {
		resp.PolicyNumber = policyNumber.String
	}
	if idProv.Valid {
		resp.IDProvider = idProv.String
	}
	if provName.Valid {
		resp.ProviderName = provName.String
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("[GetPolizaByPaciente] Error encoding JSON: %v", err)
	}
}
