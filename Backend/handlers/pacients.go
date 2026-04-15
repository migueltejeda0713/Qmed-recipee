package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

func InsertPaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var input models.PatientInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error decoding JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	email, ok := r.Context().Value(middleware.DoctorEmailKey).(string)
	if !ok || email == "" {
		http.Error(w, "Unauthorized: missing doctor email", http.StatusUnauthorized)
		return
	}

	database := db.InitDB()
	defer database.Close()

	var doctorID string
	err := database.QueryRow("SELECT BIN_TO_UUID(id_doctor, TRUE) FROM doctor WHERE email = ?", email).Scan(&doctorID)
	if err != nil {
		log.Printf("Error getting doctor ID: %v", err)
		http.Error(w, "Doctor not found", http.StatusUnauthorized)
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
				log.Printf("Error checking document: %v", err)
				http.Error(w, "Error checking document", http.StatusInternalServerError)
				return
			}

			if exists > 0 {
				http.Error(w, "Document ID already registered", http.StatusBadRequest)
				return
			}
		}
	}

	fullName := input.FirstName + " " + input.LastName

	var policyID sql.NullString
	if input.IDProvider != "" && input.PolicyNumber != "" {
		policyQuery := `
			INSERT INTO insurance_policy (id_provider, policy_number)
			VALUES (UUID_TO_BIN(?, TRUE), ?)
		`
		_, err := database.Exec(policyQuery, input.IDProvider, input.PolicyNumber)
		if err != nil {
			log.Printf("Error inserting insurance policy: %v", err)
			http.Error(w, "Error inserting insurance policy: "+err.Error(), http.StatusInternalServerError)
			return
		}
		// Get the UUID of the last inserted policy
		var lastID string
		err = database.QueryRow("SELECT BIN_TO_UUID(id_policy, TRUE) FROM insurance_policy ORDER BY created_at DESC LIMIT 1").Scan(&lastID)
		if err != nil {
			log.Printf("Error getting policy id: %v", err)
			http.Error(w, "Error getting policy id: "+err.Error(), http.StatusInternalServerError)
			return
		}
		policyID = sql.NullString{String: lastID, Valid: true}
	} else {
		policyID = sql.NullString{Valid: false}
	}

	phone := sql.NullString{String: input.Phone, Valid: input.Phone != ""}

	var patientQuery string
	var execErr error
	if policyID.Valid {
		patientQuery = `
			INSERT INTO patient (name, birth_date, phone, document_id, id_policy, id_doctor)
			VALUES (?, ?, ?, ?, UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE))
		`
		_, execErr = database.Exec(
			patientQuery,
			fullName,
			input.BirthDate,
			phone,
			input.DocumentID,
			policyID.String,
			doctorID,
		)
	} else {
		patientQuery = `
			INSERT INTO patient (name, birth_date, phone, document_id, id_policy, id_doctor)
			VALUES (?, ?, ?, ?, NULL, UUID_TO_BIN(?, TRUE))
		`
		_, execErr = database.Exec(
			patientQuery,
			fullName,
			input.BirthDate,
			phone,
			input.DocumentID,
			doctorID,
		)
	}
	if execErr != nil {
		log.Printf("Error inserting patient: %v", execErr)
		http.Error(w, "Error inserting patient: "+execErr.Error(), http.StatusInternalServerError)
		return
	}

	// Get the UUID of the newly inserted patient
	var patientUUID string
	err = database.QueryRow("SELECT BIN_TO_UUID(id_patient, TRUE) FROM patient ORDER BY created_at DESC LIMIT 1").Scan(&patientUUID)
	if err != nil {
		http.Error(w, "Error getting id: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message":    "Patient registered successfully",
		"id_patient": patientUUID,
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
