package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"
)

const (
	defaultPage     = 1
	defaultPageSize = 10
	dateFormat      = "2006-01-02"
)

// ErrorResponse is kept for backward compatibility; new code should use
// ErrorPayload (defined in errors.go) which also exposes a stable `code`.
type ErrorResponse = ErrorPayload

func calculateAge(dateStr string) string {
	t, err := time.Parse(dateFormat, dateStr)
	if err != nil {
		log.Printf("Error parsing date: %v", err)
		return ""
	}

	now := time.Now()
	age := now.Year() - t.Year()
	if now.Month() < t.Month() || (now.Month() == t.Month() && now.Day() < t.Day()) {
		age--
	}
	return strconv.Itoa(age)
}

func parsePaginationParams(r *http.Request) (int, int) {
	page := defaultPage
	limit := defaultPageSize

	if p := r.URL.Query().Get("page"); p != "" {
		if pInt, err := strconv.Atoi(p); err == nil && pInt > 0 {
			page = pInt
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if lInt, err := strconv.Atoi(l); err == nil && lInt > 0 {
			limit = lInt
		}
	}
	return page, limit
}

func GetPacientesPaginados(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	email, _ := r.Context().Value(middleware.DoctorEmailKey).(string)
	page, limit := parsePaginationParams(r)
	offset := (page - 1) * limit

	dbConn := db.InitDB()

	query := `
		SELECT
			BIN_TO_UUID(p.id_patient, TRUE),
			p.name,
			p.birth_date,
			p.document_id,
			p.phone,
			COALESCE(ip.provider_name, 'Not specified'),
			COALESCE(pol.policy_number, 'No policy registered')
		FROM patient p
		LEFT JOIN insurance_policy pol ON p.id_policy = pol.id_policy
		LEFT JOIN insurance_provider ip ON pol.id_provider = ip.id_provider
		WHERE p.id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?;
	`

	rows, err := dbConn.Query(query, email, limit, offset)
	if err != nil {
		log.Printf("Error executing query: %v", err)
		writeError(w, http.StatusInternalServerError, "Error querying patients")
		return
	}
	defer rows.Close()

	patients := []models.Patient{}

	for rows.Next() {
		var p models.Patient
		var phone, provider, policyNumber sql.NullString

		if err := rows.Scan(
			&p.ID,
			&p.Name,
			&p.BirthDate,
			&p.DocumentID,
			&phone,
			&provider,
			&policyNumber,
		); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		p.Age = calculateAge(p.BirthDate)
		if phone.Valid {
			p.Phone = phone.String
		}
		if provider.Valid {
			p.Provider = provider.String
		}
		if policyNumber.Valid {
			p.PolicyNumber = policyNumber.String
		}

		patients = append(patients, p)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Post-iteration error: %v", err)
		writeError(w, http.StatusInternalServerError, "Error reading results")
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"data": patients})
}

// writeError preserves the legacy signature but now also logs the response
// to terminal so every error is visible during development.
func writeError(w http.ResponseWriter, status int, msg string) {
	log.Printf("[%s] %d %s", callerName(2), status, msg)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorPayload{Error: msg})
}
