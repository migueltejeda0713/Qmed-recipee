package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

func DeletePaciente(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idPatient := vars["id"]

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodDelete {
		clientError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Método HTTP no permitido")
		return
	}

	email, _ := r.Context().Value(middleware.DoctorEmailKey).(string)

	dbConn := db.InitDB()

	query := `
		DELETE FROM patient
		WHERE id_patient = UUID_TO_BIN(?, TRUE)
		  AND id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
	`
	result, err := dbConn.Exec(query, idPatient, email)
	if err != nil {
		serverError(w, "delete_patient", err)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		clientError(w, http.StatusNotFound, "patient_not_found", "El paciente no existe o no pertenece a este médico")
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient deleted successfully"))
}
