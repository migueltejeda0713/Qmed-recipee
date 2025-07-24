package handlers

import (
	"Qmed-Recipe/db"
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

type ErrorResponse struct {
	Error string `json:"error"`
}

func calcularEdad(fechaStr string) string {
	t, err := time.Parse(dateFormat, fechaStr)
	if err != nil {
		log.Printf("Error parseando fecha: %v", err)
		return ""
	}

	now := time.Now()
	edad := now.Year() - t.Year()
	if now.Month() < t.Month() || (now.Month() == t.Month() && now.Day() < t.Day()) {
		edad--
	}
	return strconv.Itoa(edad)
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

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	page, limit := parsePaginationParams(r)
	offset := (page - 1) * limit

	dbConn := db.InitDB()
	defer dbConn.Close()

	query := `
		SELECT 
			p.id_pacient, 
			p.nombre, 
			p.fecha_nacimiento, 
			p.documento_paciente, 
			p.telefono,
			COALESCE(a.nombre_aseguradora, 'No especificada'),
			COALESCE(ns.numero_poliza, 'Sin poliza registrada')
		FROM paciente p
		LEFT JOIN numero_seguro ns ON p.id_seguro = ns.id_seguro
		LEFT JOIN aseguradoras a ON ns.id_aseguradora = a.id_seguro
		ORDER BY p.id_pacient DESC
		LIMIT ? OFFSET ?;
	`

	rows, err := dbConn.Query(query, limit, offset)
	if err != nil {
		log.Printf("Error ejecutando consulta: %v", err)
		writeError(w, http.StatusInternalServerError, "Error consultando pacientes")
		return
	}
	defer rows.Close()

	var pacientes []models.Paciente

	for rows.Next() {
		var p models.Paciente
		var telefono, aseguradora, numeroPoliza sql.NullString

		if err := rows.Scan(
			&p.ID,
			&p.Nombre,
			&p.FechaNacimiento,
			&p.Cedula,
			&telefono,
			&aseguradora,
			&numeroPoliza,
		); err != nil {
			log.Printf("Error escaneando fila: %v", err)
			continue
		}

		p.Edad = calcularEdad(p.FechaNacimiento)
		if telefono.Valid {
			p.Telefono = telefono.String
		}
		if aseguradora.Valid {
			p.Aseguradora = aseguradora.String
		}
		if numeroPoliza.Valid {
			p.NumeroPoliza = numeroPoliza.String
		}

		pacientes = append(pacientes, p)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error post-iteración: %v", err)
		writeError(w, http.StatusInternalServerError, "Error leyendo resultados")
		return
	}

	json.NewEncoder(w).Encode(pacientes)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: msg})
}
