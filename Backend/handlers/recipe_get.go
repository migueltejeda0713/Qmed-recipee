package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// GetRecipe returns a single recipe with its prescriptions.
// Route: GET /api/recipes/{id}
func GetRecipe(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	recipeID := mux.Vars(r)["id"]
	doctorID := doctorIDFromCtx(r)

	database := db.InitDB()

	recipe, err := loadRecipe(database, recipeID)
	if err != nil {
		writeRecipeError(w, err)
		return
	}
	if recipe.IDDoctor != doctorID {
		writeRecipeError(w, errNotOwner)
		return
	}

	lines, err := loadPrescriptions(database, recipeID)
	if err != nil {
		serverError(w, "load_prescriptions", err)
		return
	}
	recipe.Prescriptions = lines

	_ = json.NewEncoder(w).Encode(recipe)
}

func loadRecipe(database *sql.DB, recipeID string) (*models.Recipe, error) {
	row := database.QueryRow(
		`SELECT
			BIN_TO_UUID(id_recipe, TRUE),
			recipe_number,
			BIN_TO_UUID(id_patient, TRUE),
			BIN_TO_UUID(id_doctor, TRUE),
			row_status_id,
			general_notes,
			doctor_name_snapshot,
			doctor_license_snapshot,
			patient_name_snapshot,
			patient_document_snapshot,
			issued_at, cancelled_at, cancellation_reason, expires_at,
			printed_at, print_count,
			created_at, updated_at
		 FROM recipe
		 WHERE id_recipe = UUID_TO_BIN(?, TRUE)`,
		recipeID,
	)

	var rec models.Recipe
	var (
		recipeNumber, notes, docName, docLicense, patName, patDoc sql.NullString
		issuedAt, cancelledAt, cancelReason, expiresAt, printedAt sql.NullString
		statusID                                                  uint8
	)
	if err := row.Scan(
		&rec.ID, &recipeNumber, &rec.IDPatient, &rec.IDDoctor, &statusID,
		&notes, &docName, &docLicense, &patName, &patDoc,
		&issuedAt, &cancelledAt, &cancelReason, &expiresAt,
		&printedAt, &rec.PrintCount, &rec.CreatedAt, &rec.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, errRecipeNotFound
		}
		return nil, err
	}
	rec.StatusCode = statusCodeOf(statusID)
	rec.RecipeNumber = nullToPtr(recipeNumber)
	rec.GeneralNotes = nullToPtr(notes)
	rec.DoctorNameSnapshot = nullToPtr(docName)
	rec.DoctorLicenseSnapshot = nullToPtr(docLicense)
	rec.PatientNameSnapshot = nullToPtr(patName)
	rec.PatientDocumentSnapshot = nullToPtr(patDoc)
	rec.IssuedAt = nullToPtr(issuedAt)
	rec.CancelledAt = nullToPtr(cancelledAt)
	rec.CancellationReason = nullToPtr(cancelReason)
	rec.ExpiresAt = nullToPtr(expiresAt)
	rec.PrintedAt = nullToPtr(printedAt)
	return &rec, nil
}

func loadPrescriptions(database *sql.DB, recipeID string) ([]models.Prescription, error) {
	rows, err := database.Query(
		`SELECT
			BIN_TO_UUID(id_prescription, TRUE),
			BIN_TO_UUID(id_recipe, TRUE),
			BIN_TO_UUID(id_medicine, TRUE),
			name, quantity, dosage, usage_instructions, created_at
		 FROM prescription
		 WHERE id_recipe = UUID_TO_BIN(?, TRUE)
		 ORDER BY created_at ASC`,
		recipeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Prescription{}
	for rows.Next() {
		var p models.Prescription
		var idMedicine, usage sql.NullString
		if err := rows.Scan(&p.ID, &p.IDRecipe, &idMedicine, &p.Name, &p.Quantity, &p.Dosage, &usage, &p.CreatedAt); err != nil {
			return nil, err
		}
		p.IDMedicine = nullToPtr(idMedicine)
		if usage.Valid {
			p.UsageInstructions = usage.String
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func nullToPtr(n sql.NullString) *string {
	if !n.Valid {
		return nil
	}
	v := n.String
	return &v
}
