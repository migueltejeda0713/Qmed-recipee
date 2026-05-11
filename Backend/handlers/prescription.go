package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func validatePrescriptionInput(p models.PrescriptionInput) error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("prescription name is required")
	}
	if strings.TrimSpace(p.Quantity) == "" {
		return errors.New("prescription quantity is required")
	}
	if strings.TrimSpace(p.Dosage) == "" {
		return errors.New("prescription dosage is required")
	}
	return nil
}

func insertPrescriptionTx(tx *sql.Tx, recipeID string, p models.PrescriptionInput) (string, error) {
	id := uuid.New().String()
	usage := sql.NullString{String: p.UsageInstructions, Valid: p.UsageInstructions != ""}

	if p.IDMedicine != "" {
		_, err := tx.Exec(
			`INSERT INTO prescription
				(id_prescription, id_recipe, id_medicine, name, quantity, dosage, usage_instructions)
			 VALUES
				(UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?, ?, ?, ?)`,
			id, recipeID, p.IDMedicine, p.Name, p.Quantity, p.Dosage, usage,
		)
		return id, err
	}
	_, err := tx.Exec(
		`INSERT INTO prescription
			(id_prescription, id_recipe, name, quantity, dosage, usage_instructions)
		 VALUES
			(UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?, ?, ?, ?)`,
		id, recipeID, p.Name, p.Quantity, p.Dosage, usage,
	)
	return id, err
}

// AddPrescription adds a single line to a DRAFT recipe.
// Route: POST /api/recipes/{id}/prescriptions
func AddPrescription(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	recipeID := mux.Vars(r)["id"]
	doctorID := doctorIDFromCtx(r)

	var input models.PrescriptionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Bad request")
		return
	}
	if err := validatePrescriptionInput(input); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	database := db.InitDB()

	if err := assertOwnerAndDraft(database, recipeID, doctorID); err != nil {
		writeRecipeError(w, err)
		return
	}

	tx, err := database.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Server error")
		return
	}
	defer func() { _ = tx.Rollback() }()

	id, err := insertPrescriptionTx(tx, recipeID, input)
	if err != nil {
		log.Printf("AddPrescription: %v", err)
		writeError(w, http.StatusInternalServerError, "Error adding prescription")
		return
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "Server error")
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"id_prescription": id})
}

// UpdatePrescription edits a single line in a DRAFT recipe.
// Route: PUT /api/recipes/{id}/prescriptions/{pid}
func UpdatePrescription(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	recipeID := vars["id"]
	prescID := vars["pid"]
	doctorID := doctorIDFromCtx(r)

	var input models.PrescriptionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Bad request")
		return
	}
	if err := validatePrescriptionInput(input); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	database := db.InitDB()

	if err := assertOwnerAndDraft(database, recipeID, doctorID); err != nil {
		writeRecipeError(w, err)
		return
	}

	usage := sql.NullString{String: input.UsageInstructions, Valid: input.UsageInstructions != ""}
	var idMedicine interface{}
	var query string
	if input.IDMedicine != "" {
		query = `UPDATE prescription
		         SET name = ?, quantity = ?, dosage = ?, usage_instructions = ?,
		             id_medicine = UUID_TO_BIN(?, TRUE)
		         WHERE id_prescription = UUID_TO_BIN(?, TRUE)
		           AND id_recipe = UUID_TO_BIN(?, TRUE)`
		idMedicine = input.IDMedicine
	} else {
		query = `UPDATE prescription
		         SET name = ?, quantity = ?, dosage = ?, usage_instructions = ?,
		             id_medicine = NULL
		         WHERE id_prescription = UUID_TO_BIN(?, TRUE)
		           AND id_recipe = UUID_TO_BIN(?, TRUE)`
	}

	var res sql.Result
	var err error
	if idMedicine != nil {
		res, err = database.Exec(query, input.Name, input.Quantity, input.Dosage, usage, idMedicine, prescID, recipeID)
	} else {
		res, err = database.Exec(query, input.Name, input.Quantity, input.Dosage, usage, prescID, recipeID)
	}
	if err != nil {
		log.Printf("UpdatePrescription: %v", err)
		writeError(w, http.StatusInternalServerError, "Error updating prescription")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "Prescription not found")
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Prescription updated"})
}

// DeletePrescription removes a line from a DRAFT recipe.
// Route: DELETE /api/recipes/{id}/prescriptions/{pid}
func DeletePrescription(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	recipeID := vars["id"]
	prescID := vars["pid"]
	doctorID := doctorIDFromCtx(r)

	database := db.InitDB()

	if err := assertOwnerAndDraft(database, recipeID, doctorID); err != nil {
		writeRecipeError(w, err)
		return
	}

	res, err := database.Exec(
		`DELETE FROM prescription
		 WHERE id_prescription = UUID_TO_BIN(?, TRUE)
		   AND id_recipe = UUID_TO_BIN(?, TRUE)`,
		prescID, recipeID,
	)
	if err != nil {
		log.Printf("DeletePrescription: %v", err)
		writeError(w, http.StatusInternalServerError, "Error deleting prescription")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "Prescription not found")
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Prescription deleted"})
}
