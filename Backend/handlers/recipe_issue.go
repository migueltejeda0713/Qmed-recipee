package handlers

import (
	"Qmed-Recipe/db"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// IssueRecipe transitions a DRAFT recipe to ISSUED:
//   - validates required data and at least one prescription
//   - generates recipe_number (RX-YYYY-NNNNNN) atomically
//   - freezes doctor + patient snapshots
//   - sets issued_at
//   - flips row_status to ISSUED (recipe becomes immutable from this point)
//
// Route: POST /api/recipes/{id}/issue
func IssueRecipe(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	recipeID := mux.Vars(r)["id"]
	doctorID := doctorIDFromCtx(r)

	database := db.InitDB()

	if err := assertOwnerAndDraft(database, recipeID, doctorID); err != nil {
		writeRecipeError(w, err)
		return
	}

	var lineCount int
	if err := database.QueryRow(
		`SELECT COUNT(*) FROM prescription WHERE id_recipe = UUID_TO_BIN(?, TRUE)`,
		recipeID,
	).Scan(&lineCount); err != nil {
		serverError(w, "count_prescriptions", err)
		return
	}
	if lineCount == 0 {
		clientError(w, http.StatusBadRequest, "no_prescriptions",
			"La receta debe tener al menos un medicamento antes de emitirse")
		return
	}

	tx, err := database.Begin()
	if err != nil {
		serverError(w, "begin_tx", err)
		return
	}
	defer func() { _ = tx.Rollback() }()

	var docName, docLicense, patName, patDoc string
	if err := tx.QueryRow(
		`SELECT d.name, d.license_number, p.name, p.document_id
		 FROM recipe r
		 JOIN doctor  d ON d.id_doctor  = r.id_doctor
		 JOIN patient p ON p.id_patient = r.id_patient
		 WHERE r.id_recipe = UUID_TO_BIN(?, TRUE)`,
		recipeID,
	).Scan(&docName, &docLicense, &patName, &patDoc); err != nil {
		serverError(w, "snapshot_lookup", err)
		return
	}

	recipeNumber, err := nextRecipeNumber(tx, time.Now().Year())
	if err != nil {
		serverError(w, "next_recipe_number", err)
		return
	}

	if _, err := tx.Exec(
		`UPDATE recipe
		 SET row_status_id = ?,
		     recipe_number = ?,
		     issued_at     = CURRENT_TIMESTAMP,
		     expires_at    = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY),
		     doctor_name_snapshot      = ?,
		     doctor_license_snapshot   = ?,
		     patient_name_snapshot     = ?,
		     patient_document_snapshot = ?
		 WHERE id_recipe = UUID_TO_BIN(?, TRUE)
		   AND row_status_id = ?`,
		StatusIssued, recipeNumber,
		docName, docLicense, patName, patDoc,
		recipeID, StatusDraft,
	); err != nil {
		serverError(w, "update_issue", err)
		return
	}

	logRecipeEvent(tx, recipeID, doctorID, EventIssued)

	if err := tx.Commit(); err != nil {
		serverError(w, "commit_tx", err)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]string{
		"message":       "Recipe issued",
		"recipe_number": recipeNumber,
		"status":        "ISSUED",
	})
}

// nextRecipeNumber atomically increments the per-year counter and returns
// the formatted recipe number (RX-YYYY-NNNNNN).
func nextRecipeNumber(tx *sql.Tx, year int) (string, error) {
	if _, err := tx.Exec(
		`INSERT INTO recipe_sequence (year, last_number)
		 VALUES (?, 1)
		 ON DUPLICATE KEY UPDATE last_number = last_number + 1`,
		year,
	); err != nil {
		return "", err
	}
	var n uint32
	if err := tx.QueryRow(
		`SELECT last_number FROM recipe_sequence WHERE year = ?`,
		year,
	).Scan(&n); err != nil {
		return "", err
	}
	return fmt.Sprintf("RX-%d-%06d", year, n), nil
}
