package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// UpdateRecipe edits header fields of a DRAFT recipe (currently general_notes).
// Route: PUT /api/recipes/{id}
func UpdateRecipe(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	recipeID := mux.Vars(r)["id"]
	doctorID := doctorIDFromCtx(r)

	var input models.UpdateRecipeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}

	database := db.InitDB()

	if err := assertOwnerAndDraft(database, recipeID, doctorID); err != nil {
		writeRecipeError(w, err)
		return
	}

	if input.GeneralNotes != nil {
		notes := sql.NullString{String: *input.GeneralNotes, Valid: *input.GeneralNotes != ""}
		if _, err := database.Exec(
			`UPDATE recipe SET general_notes = ?
			 WHERE id_recipe = UUID_TO_BIN(?, TRUE)`,
			notes, recipeID,
		); err != nil {
			serverError(w, "update_recipe_notes", err)
			return
		}
	}

	logRecipeEvent(database, recipeID, doctorID, EventDraftUpdated)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Recipe updated"})
}
