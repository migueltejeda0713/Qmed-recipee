package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

func ActivatePaciente(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idPatient := vars["id"]

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	email, _ := r.Context().Value(middleware.DoctorEmailKey).(string)

	dbConn := db.InitDB()

	result, err := dbConn.Exec(`
		UPDATE patient SET row_status_id = 2
		WHERE id_patient = UUID_TO_BIN(?, TRUE)
		  AND id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
		  AND row_status_id = 3
	`, idPatient, email)
	if err != nil {
		serverError(w, "activate_patient", err)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		clientError(w, http.StatusNotFound, "patient_not_found", "El paciente no existe, ya está activo o no pertenece a este médico")
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ACTIVE"}`))
}
