package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// PrintRecipe returns the printable document reconstructed from snapshots,
// and registers the print event (printed_at + print_count++).
//
// The document is built ENTIRELY from data persisted on the recipe at
// issuance time, so reprints stay historically fidel even if doctor,
// patient, or medicine catalog change later.
//
// Route: POST /api/recipes/{id}/print
func PrintRecipe(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	recipeID := mux.Vars(r)["id"]
	doctorID := doctorIDFromCtx(r)

	database := db.InitDB()

	rec, err := loadRecipe(database, recipeID)
	if err != nil {
		writeRecipeError(w, err)
		return
	}
	if rec.IDDoctor != doctorID {
		writeRecipeError(w, errNotOwner)
		return
	}
	if rec.StatusCode != "ISSUED" && rec.StatusCode != "PRINTED" {
		clientError(w, http.StatusConflict, "recipe_not_issued", "Solo se pueden imprimir recetas emitidas")
		return
	}
	if rec.RecipeNumber == nil || rec.IssuedAt == nil ||
		rec.DoctorNameSnapshot == nil || rec.PatientNameSnapshot == nil {
		clientError(w, http.StatusConflict, "missing_snapshot", "La receta no tiene los datos requeridos para imprimirse")
		return
	}

	lines, err := loadPrescriptions(database, recipeID)
	if err != nil {
		serverError(w, "load_prescriptions", err)
		return
	}

	if _, err := database.Exec(
		`UPDATE recipe
		 SET printed_at = CURRENT_TIMESTAMP, print_count = print_count + 1
		 WHERE id_recipe = UUID_TO_BIN(?, TRUE)`,
		recipeID,
	); err != nil {
		serverError(w, "register_print", err)
		return
	}

	doc := models.RecipeDocument{
		RecipeNumber:    *rec.RecipeNumber,
		IssuedAt:        *rec.IssuedAt,
		DoctorName:      strDeref(rec.DoctorNameSnapshot),
		DoctorLicense:   strDeref(rec.DoctorLicenseSnapshot),
		PatientName:     strDeref(rec.PatientNameSnapshot),
		PatientDocument: strDeref(rec.PatientDocumentSnapshot),
		GeneralNotes:    strDeref(rec.GeneralNotes),
		Prescriptions:   lines,
		PrintCount:      rec.PrintCount + 1,
	}

	_ = json.NewEncoder(w).Encode(doc)
}

func strDeref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
