package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

// CancelRecipe transitions an ISSUED recipe to CANCELLED with a reason.
// Route: POST /api/recipes/{id}/cancel
func CancelRecipe(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	recipeID := mux.Vars(r)["id"]
	doctorID := doctorIDFromCtx(r)

	var input models.CancelRecipeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}
	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		clientError(w, http.StatusBadRequest, "missing_reason", "Debes indicar el motivo de la cancelación")
		return
	}

	database := db.InitDB()

	status, err := assertOwner(database, recipeID, doctorID)
	if err != nil {
		writeRecipeError(w, err)
		return
	}
	if status != StatusIssued && status != StatusPrinted {
		clientError(w, http.StatusConflict, "recipe_not_issued", "Solo se pueden cancelar recetas emitidas")
		return
	}

	res, err := database.Exec(
		`UPDATE recipe
		 SET row_status_id = ?, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?
		 WHERE id_recipe = UUID_TO_BIN(?, TRUE) AND row_status_id IN (?, ?)`,
		StatusCancelled, reason, recipeID, StatusIssued, StatusPrinted,
	)
	if err != nil {
		serverError(w, "cancel_recipe", err)
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		clientError(w, http.StatusConflict, "state_changed", "El estado de la receta cambió; recarga e intenta de nuevo")
		return
	}
	logRecipeEvent(database, recipeID, doctorID, EventCancelled)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Recipe cancelled", "status": "CANCELLED"})
}
