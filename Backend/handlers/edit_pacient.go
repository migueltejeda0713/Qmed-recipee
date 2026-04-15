package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

func validateCedula(cedula string) bool {
	cedula = strings.ReplaceAll(cedula, "-", "")
	if len(cedula) != 11 {
		return false
	}

	multiplicadores := []int{1, 2, 1, 2, 1, 2, 1, 2, 1, 2}
	suma := 0

	for i := 0; i < 10; i++ {
		digito := int(cedula[i] - '0')
		producto := digito * multiplicadores[i]

		if producto >= 10 {
			producto = (producto / 10) + (producto % 10)
		}

		suma += producto
	}

	digitoVerificador := int(cedula[10] - '0')
	return (10-(suma%10))%10 == digitoVerificador
}

func EditPaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	idPatient := vars["id"]

	var input models.PatientInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error decoding JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	if !validateCedula(input.DocumentID) {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	fullName := input.FirstName + " " + input.LastName
	phone := sql.NullString{String: input.Phone, Valid: input.Phone != ""}
	var policyID sql.NullString

	if input.IDProvider != "" && input.PolicyNumber != "" {
		policyQuery := `
			INSERT INTO insurance_policy (id_provider, policy_number)
			VALUES (UUID_TO_BIN(?, TRUE), ?)
		`
		_, err := dbConn.Exec(policyQuery, input.IDProvider, input.PolicyNumber)
		if err != nil {
			http.Error(w, "Error inserting insurance policy", http.StatusInternalServerError)
			return
		}
		var lastID string
		err = dbConn.QueryRow("SELECT BIN_TO_UUID(id_policy, TRUE) FROM insurance_policy ORDER BY created_at DESC LIMIT 1").Scan(&lastID)
		if err != nil {
			http.Error(w, "Error getting policy id", http.StatusInternalServerError)
			return
		}
		policyID = sql.NullString{String: lastID, Valid: true}
	} else {
		policyID = sql.NullString{Valid: false}
	}

	var updateQuery string
	var err error

	if policyID.Valid {
		updateQuery = `
			UPDATE patient
			SET name = ?, birth_date = ?, phone = ?, document_id = ?, id_policy = UUID_TO_BIN(?, TRUE)
			WHERE id_patient = UUID_TO_BIN(?, TRUE)
		`
		_, err = dbConn.Exec(
			updateQuery,
			fullName,
			input.BirthDate,
			phone,
			input.DocumentID,
			policyID.String,
			idPatient,
		)
	} else {
		updateQuery = `
			UPDATE patient
			SET name = ?, birth_date = ?, phone = ?, document_id = ?
			WHERE id_patient = UUID_TO_BIN(?, TRUE)
		`
		_, err = dbConn.Exec(
			updateQuery,
			fullName,
			input.BirthDate,
			phone,
			input.DocumentID,
			idPatient,
		)
	}

	if err != nil {
		http.Error(w, "Error updating patient", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Patient updated successfully"})
}
