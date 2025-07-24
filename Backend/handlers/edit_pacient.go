package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

func validateCedula(cedula string) bool {
	cedula = strings.ReplaceAll(cedula, "-", "")
	if len(cedula) != 11 {
		return false
	}

	multiplicadores := []int{1, 2, 1, 2, 1, 2, 1, 2, 1, 2}
	suma := 0

	for i := 0; i < 10; i++ {
		digito := int(cedula[i] - '0')
		producto := digito * multiplicadores[i]

		if producto >= 10 {
			producto = (producto / 10) + (producto % 10)
		}

		suma += producto
	}

	digitoVerificador := int(cedula[10] - '0')
	return (10 - (suma % 10))%10 == digitoVerificador
}

func EditPaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	idPacienteStr := vars["id"]
	idPaciente, err := strconv.Atoi(idPacienteStr)
	if err != nil {
		http.Error(w, "ID inválido", http.StatusBadRequest)
		return
	}

	var input models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error decodificando JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	if !validateCedula(input.CedulaPaciente) {
		http.Error(w, "Cédula inválida", http.StatusBadRequest)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	fullName := input.NombrePaciente + " " + input.ApellidoPaciente
	telefono := sql.NullString{String: input.TelefonoPaciente, Valid: input.TelefonoPaciente != ""}
	var seguroID sql.NullInt64

	if input.IdAseguradora != 0 && input.PolizaPaciente != "" {
		numSeguroQuery := `
			INSERT INTO numero_seguro (id_aseguradora, numero_poliza)
			VALUES (?, ?)
		`
		res, err := dbConn.Exec(numSeguroQuery, input.IdAseguradora, input.PolizaPaciente)
		if err != nil {
			http.Error(w, "Error insertando número de seguro", http.StatusInternalServerError)
			return
		}
		lastID, _ := res.LastInsertId()
		seguroID = sql.NullInt64{Int64: lastID, Valid: true}
	} else {
		seguroID = sql.NullInt64{Valid: false}
	}

	updateQuery := `
		UPDATE paciente
		SET nombre = ?, fecha_nacimiento = ?, telefono = ?, documento_paciente = ?, id_seguro = ?
		WHERE id_pacient = ?
	`

	_, err = dbConn.Exec(
		updateQuery,
		fullName,
		input.EdadPaciente,
		telefono,
		input.CedulaPaciente,
		seguroID,
		idPaciente,
	)

	if err != nil {
		http.Error(w, "Error actualizando paciente", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Paciente actualizado correctamente"})
}
