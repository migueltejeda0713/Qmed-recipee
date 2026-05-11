package handlers

import (
	"Qmed-Recipe/db"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

// ListRecipes returns the doctor's recipes, newest first, with optional ?status= filter.
// Route: GET /api/recipes
func ListRecipes(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	doctorID := doctorIDFromCtx(r)
	page, limit := parsePaginationParams(r)
	offset := (page - 1) * limit
	statusFilter := r.URL.Query().Get("status")

	database := db.InitDB()

	args := []interface{}{doctorID}
	where := "WHERE r.id_doctor = UUID_TO_BIN(?, TRUE)"
	if statusFilter != "" {
		where += " AND s.status_code = ?"
		args = append(args, statusFilter)
	}
	args = append(args, limit, offset)

	query := `
		SELECT
			BIN_TO_UUID(r.id_recipe, TRUE),
			r.recipe_number,
			BIN_TO_UUID(r.id_patient, TRUE),
			COALESCE(r.patient_name_snapshot, p.name) AS patient_name,
			s.status_code,
			r.issued_at,
			r.created_at,
			(SELECT COUNT(*) FROM prescription pr WHERE pr.id_recipe = r.id_recipe) AS line_count
		FROM recipe r
		JOIN row_status s ON s.id_status = r.row_status_id
		JOIN patient p    ON p.id_patient = r.id_patient
		` + where + `
		ORDER BY r.created_at DESC
		LIMIT ? OFFSET ?`

	rows, err := database.Query(query, args...)
	if err != nil {
		serverError(w, "query_recipes", err)
		return
	}
	defer rows.Close()

	type item struct {
		ID           string  `json:"id"`
		RecipeNumber *string `json:"recipe_number,omitempty"`
		IDPatient    string  `json:"id_patient"`
		PatientName  string  `json:"patient_name"`
		Status       string  `json:"status"`
		IssuedAt     *string `json:"issued_at,omitempty"`
		CreatedAt    string  `json:"created_at"`
		LineCount    int     `json:"line_count"`
	}

	out := []item{}
	for rows.Next() {
		var it item
		var recipeNumber, issuedAt sql.NullString
		if err := rows.Scan(&it.ID, &recipeNumber, &it.IDPatient, &it.PatientName,
			&it.Status, &issuedAt, &it.CreatedAt, &it.LineCount); err != nil {
			log.Printf("ListRecipes scan: %v", err)
			continue
		}
		it.RecipeNumber = nullToPtr(recipeNumber)
		it.IssuedAt = nullToPtr(issuedAt)
		out = append(out, it)
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": out})
}
