package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
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

	email, _ := r.Context().Value(middleware.DoctorEmailKey).(string)

	var input models.PatientInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}

	if !validateCedula(input.DocumentID) {
		clientError(w, http.StatusBadRequest, "invalid_document", "El número de cédula no es válido")
		return
	}

	dbConn := db.InitDB()

	fullName := input.FirstName + " " + input.LastName
	phone := sql.NullString{String: input.Phone, Valid: input.Phone != ""}
	var policyID sql.NullString

	if input.IDProvider != "" && input.PolicyNumber != "" {
		newPolicyID := uuid.New().String()
		_, err := dbConn.Exec(
			`INSERT INTO insurance_policy (id_policy, id_provider, policy_number)
			 VALUES (UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?)`,
			newPolicyID, input.IDProvider, input.PolicyNumber,
		)
		if err != nil {
			serverError(w, "insert_insurance_policy", err)
			return
		}
		policyID = sql.NullString{String: newPolicyID, Valid: true}
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
			  AND id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
		`
		_, err = dbConn.Exec(
			updateQuery,
			fullName, input.BirthDate, phone, input.DocumentID,
			policyID.String, idPatient, email,
		)
	} else {
		updateQuery = `
			UPDATE patient
			SET name = ?, birth_date = ?, phone = ?, document_id = ?
			WHERE id_patient = UUID_TO_BIN(?, TRUE)
			  AND id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
		`
		_, err = dbConn.Exec(
			updateQuery,
			fullName, input.BirthDate, phone, input.DocumentID,
			idPatient, email,
		)
	}

	if err != nil {
		serverError(w, "update_patient", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Patient updated successfully"})
}
