package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func InsertPaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var input models.PatientInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}

	email, ok := r.Context().Value(middleware.DoctorEmailKey).(string)
	if !ok || email == "" {
		clientError(w, http.StatusUnauthorized, "missing_token", "Sesión no válida (email del médico ausente)")
		return
	}

	database := db.InitDB()

	var doctorID string
	err := database.QueryRow("SELECT BIN_TO_UUID(id_doctor, TRUE) FROM doctor WHERE email = ?", email).Scan(&doctorID)
	if err != nil {
		serverError(w, "doctor_lookup", err)
		return
	}

	if input.DocumentID != "" {
		if isAdult(input.BirthDate) {
			var exists int
			err := database.QueryRow(`
				SELECT COUNT(*) FROM patient
				WHERE document_id = ?
			`, input.DocumentID).Scan(&exists)

			if err != nil {
				serverError(w, "document_check", err)
				return
			}

			if exists > 0 {
				clientError(w, http.StatusBadRequest, "duplicate_document", "Ya existe un paciente con este documento")
				return
			}
		}
	}

	fullName := input.FirstName + " " + input.LastName

	var policyID sql.NullString
	if input.IDProvider != "" && input.PolicyNumber != "" {
		newPolicyID := uuid.New().String()
		_, err := database.Exec(
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

	phone := sql.NullString{String: input.Phone, Valid: input.Phone != ""}
	patientID := uuid.New().String()

	var execErr error
	if policyID.Valid {
		_, execErr = database.Exec(
			`INSERT INTO patient (id_patient, name, birth_date, phone, document_id, id_policy, id_doctor)
			 VALUES (UUID_TO_BIN(?, TRUE), ?, ?, ?, ?, UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE))`,
			patientID, fullName, input.BirthDate, phone, input.DocumentID, policyID.String, doctorID,
		)
	} else {
		_, execErr = database.Exec(
			`INSERT INTO patient (id_patient, name, birth_date, phone, document_id, id_policy, id_doctor)
			 VALUES (UUID_TO_BIN(?, TRUE), ?, ?, ?, ?, NULL, UUID_TO_BIN(?, TRUE))`,
			patientID, fullName, input.BirthDate, phone, input.DocumentID, doctorID,
		)
	}
	if execErr != nil {
		serverError(w, "insert_patient", execErr)
		return
	}

	response := map[string]interface{}{
		"message":    "Patient registered successfully",
		"id_patient": patientID,
	}
	if policyID.Valid {
		response["id_policy"] = policyID.String
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func isAdult(birthDate string) bool {
	layout := dateFormat
	dob, err := time.Parse(layout, birthDate)
	if err != nil {
		return false
	}

	today := time.Now()
	age := today.Year() - dob.Year()
	if today.YearDay() < dob.YearDay() {
		age--
	}

	return age >= 18
}
