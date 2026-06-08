package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

func CreateRecipe(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	doctorID := doctorIDFromCtx(r)
	if doctorID == "" {
		writeJSONError(w, http.StatusUnauthorized, "missing_token", "Sesión no válida")
		return
	}

	var input models.CreateRecipeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}
	if strings.TrimSpace(input.IDPatient) == "" {
		clientError(w, http.StatusBadRequest, "missing_patient", "El paciente es obligatorio")
		return
	}

	database := db.InitDB()

	var ownerID string
	err := database.QueryRow(
		`SELECT BIN_TO_UUID(id_doctor, TRUE) FROM patient
		 WHERE id_patient = UUID_TO_BIN(?, TRUE)`,
		input.IDPatient,
	).Scan(&ownerID)
	if err == sql.ErrNoRows {
		clientError(w, http.StatusBadRequest, "patient_not_found", "El paciente seleccionado no existe")
		return
	}
	if err != nil {
		serverError(w, "patient_lookup", err)
		return
	}
	if ownerID != doctorID {
		clientError(w, http.StatusForbidden, "patient_not_owned", "El paciente pertenece a otro médico")
		return
	}

	tx, err := database.Begin()
	if err != nil {
		serverError(w, "begin_tx", err)
		return
	}
	defer func() { _ = tx.Rollback() }()

	recipeID := uuid.New().String()
	notes := sql.NullString{String: input.GeneralNotes, Valid: input.GeneralNotes != ""}

	if _, err := tx.Exec(
		`INSERT INTO recipe (id_recipe, id_patient, id_doctor, general_notes)
		 VALUES (UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?)`,
		recipeID, input.IDPatient, doctorID, notes,
	); err != nil {
		serverError(w, "insert_recipe", err)
		return
	}

	insertedPrescriptions := make([]string, 0, len(input.Prescriptions))
	for i, p := range input.Prescriptions {
		if err := validatePrescriptionInput(p); err != nil {
			log.Printf("CreateRecipe: prescription[%d] invalid: %v", i, err)
			writeJSONError(w, http.StatusBadRequest, "invalid_prescription",
				"Medicamento "+strconv.Itoa(i+1)+": "+err.Error())
			return
		}
		pid, err := insertPrescriptionTx(tx, recipeID, p)
		if err != nil {
			serverError(w, "insert_prescription", err)
			return
		}
		insertedPrescriptions = append(insertedPrescriptions, pid)
	}

	logRecipeEvent(tx, recipeID, doctorID, EventCreated)

	if err := tx.Commit(); err != nil {
		serverError(w, "commit_tx", err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id_recipe":       recipeID,
		"status":          "DRAFT",
		"prescription_ids": insertedPrescriptions,
	})
}
