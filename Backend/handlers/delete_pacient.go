package handlers

import (
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"log"
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
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		log.Printf("[DeletePaciente] Method not allowed: %s", r.Method)
		return
	}

	email, _ := r.Context().Value(middleware.DoctorEmailKey).(string)

	dbConn := db.InitDB()
	defer dbConn.Close()

	query := `
		DELETE FROM patient
		WHERE id_patient = UUID_TO_BIN(?, TRUE)
		  AND id_doctor = (SELECT id_doctor FROM doctor WHERE email = ?)
	`
	result, err := dbConn.Exec(query, idPatient, email)
	if err != nil {
		http.Error(w, "Error deleting patient", http.StatusInternalServerError)
		log.Printf("[DeletePaciente] Error executing DELETE: %v", err)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Patient not found", http.StatusNotFound)
		log.Printf("[DeletePaciente] Patient with ID %s not found", idPatient)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient deleted successfully"))
}
