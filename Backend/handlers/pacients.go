package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
)


func InsertPaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	

	var input models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error decodificando JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	database := db.InitDB()
	defer database.Close()

	if input.CedulaPaciente != "" {
		if isAdult(input.EdadPaciente) {
			var exists int
			err := database.QueryRow(`
				SELECT COUNT(*) FROM paciente
				WHERE documento_paciente = ?
			`, input.CedulaPaciente).Scan(&exists)

			if err != nil {
				log.Printf("Error verificando cédula: %v", err)
				http.Error(w, "Error verificando cédula", http.StatusInternalServerError)
				return
			}

			if exists > 0 {
				http.Error(w, "La cédula ya está registrada por otro paciente", http.StatusBadRequest)
				return
			}
		}
	}

	fullName := input.NombrePaciente + " " + input.ApellidoPaciente

	var seguroID sql.NullInt64
	if input.IdAseguradora != 0 && input.PolizaPaciente != "" {
		numSeguroQuery := `
			INSERT INTO numero_seguro (id_aseguradora, numero_poliza)
			VALUES (?, ?)
		`
		result, err := database.Exec(numSeguroQuery, input.IdAseguradora, input.PolizaPaciente)
		if err != nil {
			log.Printf("Error insertando en numero_seguro: %v", err)
			http.Error(w, "Error insertando número de seguro: "+err.Error(), http.StatusInternalServerError)
			return
		}
		id, err := result.LastInsertId()
		if err != nil {
			log.Printf("Error obteniendo el id del número de seguro: %v", err)
			http.Error(w, "Error obteniendo el id del seguro: "+err.Error(), http.StatusInternalServerError)
			return
		}
		seguroID = sql.NullInt64{Int64: id, Valid: true}
	} else {
		seguroID = sql.NullInt64{Valid: false}
	}

	pacienteQuery := `
		INSERT INTO paciente (nombre, fecha_nacimiento, telefono, documento_paciente, id_seguro, id_doctor)
		VALUES (?, ?, ?, ?, ?, ?)
	`
	telefono := sql.NullString{String: input.TelefonoPaciente, Valid: input.TelefonoPaciente != ""}

	res, err := database.Exec(
		pacienteQuery,
		fullName,
		input.EdadPaciente,
		telefono,
		input.CedulaPaciente,
		seguroID,
		nil,
	)
	if err != nil {
		log.Printf("Error insertando en paciente: %v", err)
		http.Error(w, "Error insertando paciente: "+err.Error(), http.StatusInternalServerError)
		log.Print(input.EdadPaciente)
		return
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		http.Error(w, "Error obteniendo el id: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message":     "Paciente registrado correctamente",
		"id_paciente": lastID,
	}
	if seguroID.Valid {
		response["id_seguro"] = seguroID.Int64
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func isAdult(birthDate string) bool {
	layout := dateFormat
	dob, err := time.Parse(layout, birthDate)
	if err != nil {
		return false 
	}

	today := time.Now()
	age := today.Year() - dob.Year()
	if today.YearDay() < dob.YearDay() {
		age--
	}

	return age >= 18
}
