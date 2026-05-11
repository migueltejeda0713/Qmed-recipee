package handlers

import (
	"Qmed-Recipe/middleware"
	"database/sql"
	"errors"
	"net/http"
)

// Status IDs match the INSERT order in schema.sql row_status.
const (
	StatusDraft     uint8 = 1
	StatusActive    uint8 = 2
	StatusInactive  uint8 = 3
	StatusArchived  uint8 = 4
	StatusIssued    uint8 = 5
	StatusPrinted   uint8 = 6
	StatusCancelled uint8 = 7
	StatusExpired   uint8 = 8
)

var (
	errRecipeNotFound = errors.New("recipe not found")
	errNotOwner       = errors.New("recipe not owned by current doctor")
	errNotDraft       = errors.New("recipe is not editable")
	errNotIssued      = errors.New("recipe is not issued")
)

func doctorIDFromCtx(r *http.Request) string {
	id, _ := r.Context().Value(middleware.DoctorIDKey).(string)
	return id
}

// loadRecipeStatus returns the recipe's owning doctor id (as UUID string)
// and current row_status_id. Used by guards before mutations.
func loadRecipeStatus(database *sql.DB, recipeID string) (ownerDoctorID string, status uint8, err error) {
	err = database.QueryRow(
		`SELECT BIN_TO_UUID(id_doctor, TRUE), row_status_id
		 FROM recipe
		 WHERE id_recipe = UUID_TO_BIN(?, TRUE)`,
		recipeID,
	).Scan(&ownerDoctorID, &status)
	if err == sql.ErrNoRows {
		return "", 0, errRecipeNotFound
	}
	return ownerDoctorID, status, err
}

// assertOwnerAndDraft enforces both ownership and DRAFT state for editing.
func assertOwnerAndDraft(database *sql.DB, recipeID, doctorID string) error {
	owner, status, err := loadRecipeStatus(database, recipeID)
	if err != nil {
		return err
	}
	if owner != doctorID {
		return errNotOwner
	}
	if status != StatusDraft {
		return errNotDraft
	}
	return nil
}

// assertOwner enforces ownership only (used by GET, print, cancel).
func assertOwner(database *sql.DB, recipeID, doctorID string) (uint8, error) {
	owner, status, err := loadRecipeStatus(database, recipeID)
	if err != nil {
		return 0, err
	}
	if owner != doctorID {
		return 0, errNotOwner
	}
	return status, nil
}

func statusCodeOf(id uint8) string {
	switch id {
	case StatusDraft:
		return "DRAFT"
	case StatusIssued:
		return "ISSUED"
	case StatusCancelled:
		return "CANCELLED"
	case StatusExpired:
		return "EXPIRED"
	case StatusPrinted:
		return "PRINTED"
	default:
		return ""
	}
}

func writeRecipeError(w http.ResponseWriter, err error) bool {
	switch err {
	case nil:
		return false
	case errRecipeNotFound:
		writeJSONError(w, http.StatusNotFound, "recipe_not_found", "La receta no existe")
	case errNotOwner:
		writeJSONError(w, http.StatusForbidden, "recipe_not_owned", "Esta receta pertenece a otro médico")
	case errNotDraft:
		writeJSONError(w, http.StatusConflict, "recipe_not_draft", "La receta ya fue emitida y no se puede editar")
	case errNotIssued:
		writeJSONError(w, http.StatusConflict, "recipe_not_issued", "La receta no está emitida")
	default:
		serverError(w, "writeRecipeError", err)
	}
	return true
}
