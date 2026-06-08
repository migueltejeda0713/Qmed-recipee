package handlers

import (
	"Qmed-Recipe/db"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// ListPrescriptionTemplates returns ACTIVE templates for the authenticated doctor.
// Route: GET /api/prescription-templates?q=
func ListPrescriptionTemplates(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	doctorID := doctorIDFromCtx(r)
	q := r.URL.Query().Get("q")

	database := db.InitDB()

	where := "WHERE pt.id_doctor = UUID_TO_BIN(?, TRUE) AND pt.row_status_id = 2"
	args := []interface{}{doctorID}

	if q != "" {
		where += " AND m.medicine_name LIKE ?"
		args = append(args, "%"+q+"%")
	}

	rows, err := database.Query(
		`SELECT
			BIN_TO_UUID(pt.id_template, TRUE),
			BIN_TO_UUID(pt.id_medicine, TRUE),
			m.medicine_name,
			pt.dosage,
			COALESCE(pt.quantity, ''),
			COALESCE(pt.usage_instructions, ''),
			pt.created_at
		 FROM prescription_template pt
		 JOIN medicine m ON m.id_medicine = pt.id_medicine
		 `+where+`
		 ORDER BY m.medicine_name ASC`,
		args...,
	)
	if err != nil {
		serverError(w, "list_prescription_templates", err)
		return
	}
	defer rows.Close()

	type item struct {
		ID                string `json:"id"`
		IDMedicine        string `json:"id_medicine"`
		MedicineName      string `json:"medicine_name"`
		Dosage            string `json:"dosage"`
		Quantity          string `json:"quantity,omitempty"`
		UsageInstructions string `json:"usage_instructions,omitempty"`
		CreatedAt         string `json:"created_at"`
	}

	out := []item{}
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.ID, &it.IDMedicine, &it.MedicineName, &it.Dosage, &it.Quantity, &it.UsageInstructions, &it.CreatedAt); err != nil {
			log.Printf("ListPrescriptionTemplates scan: %v", err)
			continue
		}
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		serverError(w, "rows_prescription_templates", err)
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": out})
}

// CreatePrescriptionTemplate saves a new ACTIVE template for the authenticated doctor.
// Route: POST /api/prescription-templates
func CreatePrescriptionTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	doctorID := doctorIDFromCtx(r)

	var body struct {
		IDMedicine        string `json:"id_medicine"`
		Dosage            string `json:"dosage"`
		Quantity          string `json:"quantity"`
		UsageInstructions string `json:"usage_instructions"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		clientError(w, http.StatusBadRequest, "invalid_body", "Cuerpo de la solicitud inválido")
		return
	}
	if body.IDMedicine == "" {
		clientError(w, http.StatusUnprocessableEntity, "id_medicine_required", "El medicamento es requerido")
		return
	}
	if body.Dosage == "" {
		clientError(w, http.StatusUnprocessableEntity, "dosage_required", "La dosis es requerida")
		return
	}

	database := db.InitDB()

	var qty interface{} = nil
	if body.Quantity != "" {
		qty = body.Quantity
	}
	var usage interface{} = nil
	if body.UsageInstructions != "" {
		usage = body.UsageInstructions
	}

	_, err := database.Exec(
		`INSERT INTO prescription_template (id_doctor, id_medicine, dosage, quantity, usage_instructions)
		 VALUES (UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?, ?, ?)`,
		doctorID, body.IDMedicine, body.Dosage, qty, usage,
	)
	if err != nil {
		serverError(w, "insert_prescription_template", err)
		return
	}

	type resp struct {
		ID                string `json:"id"`
		IDMedicine        string `json:"id_medicine"`
		MedicineName      string `json:"medicine_name"`
		Dosage            string `json:"dosage"`
		Quantity          string `json:"quantity,omitempty"`
		UsageInstructions string `json:"usage_instructions,omitempty"`
		CreatedAt         string `json:"created_at"`
	}
	var out resp
	err = database.QueryRow(
		`SELECT
			BIN_TO_UUID(pt.id_template, TRUE),
			BIN_TO_UUID(pt.id_medicine, TRUE),
			m.medicine_name,
			pt.dosage,
			COALESCE(pt.quantity, ''),
			COALESCE(pt.usage_instructions, ''),
			pt.created_at
		 FROM prescription_template pt
		 JOIN medicine m ON m.id_medicine = pt.id_medicine
		 WHERE pt.id_doctor = UUID_TO_BIN(?, TRUE) AND pt.id_medicine = UUID_TO_BIN(?, TRUE)
		   AND pt.row_status_id = 2
		 ORDER BY pt.created_at DESC
		 LIMIT 1`,
		doctorID, body.IDMedicine,
	).Scan(&out.ID, &out.IDMedicine, &out.MedicineName, &out.Dosage, &out.Quantity, &out.UsageInstructions, &out.CreatedAt)
	if err != nil {
		serverError(w, "fetch_new_template", err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

// InactivatePrescriptionTemplate sets row_status_id = 3 (INACTIVE) for a template.
// Only the owning doctor can inactivate their own templates.
// Route: PUT /api/prescription-templates/{id}/inactivate
func InactivatePrescriptionTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	doctorID := doctorIDFromCtx(r)
	templateID := mux.Vars(r)["id"]

	database := db.InitDB()

	// Verify ownership before mutating.
	var ownerID string
	err := database.QueryRow(
		`SELECT BIN_TO_UUID(id_doctor, TRUE)
		 FROM prescription_template
		 WHERE id_template = UUID_TO_BIN(?, TRUE) AND row_status_id = 2`,
		templateID,
	).Scan(&ownerID)
	if err == sql.ErrNoRows {
		writeJSONError(w, http.StatusNotFound, "template_not_found", "Prescripción no encontrada")
		return
	}
	if err != nil {
		serverError(w, "check_template_owner", err)
		return
	}
	if ownerID != doctorID {
		writeJSONError(w, http.StatusForbidden, "template_not_owned", "Esta prescripción pertenece a otro médico")
		return
	}

	_, err = database.Exec(
		`UPDATE prescription_template SET row_status_id = 3
		 WHERE id_template = UUID_TO_BIN(?, TRUE)`,
		templateID,
	)
	if err != nil {
		serverError(w, "inactivate_template", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "INACTIVE"})
}
