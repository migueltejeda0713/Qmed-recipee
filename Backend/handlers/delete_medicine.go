package handlers

import (
	"net/http"

	"Qmed-Recipe/db"

	"github.com/gorilla/mux"
)

func SoftDeleteMedicamento(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id := mux.Vars(r)["id"]
	dbConn := db.InitDB()

	result, err := dbConn.Exec(
		`UPDATE medicine SET row_status_id = 3 WHERE id_medicine = UUID_TO_BIN(?, TRUE) AND row_status_id = 2`,
		id,
	)
	if err != nil {
		serverError(w, "inactivate_medicine", err)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		clientError(w, http.StatusNotFound, "medicine_not_found", "El medicamento no existe o ya está inactivo")
		return
	}

	w.WriteHeader(http.StatusOK)
}
