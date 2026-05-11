package handlers

import (
	"net/http"

	"Qmed-Recipe/db"

	"github.com/gorilla/mux"
)

func SoftDeleteLaboratorio(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id := mux.Vars(r)["id"]

	dbConn := db.InitDB()

	result, err := dbConn.Exec(
		`UPDATE laboratory SET row_status_id = 3 WHERE id_laboratory = UUID_TO_BIN(?, TRUE) AND row_status_id = 2`,
		id,
	)
	if err != nil {
		serverError(w, "soft_delete_laboratory", err)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		clientError(w, http.StatusNotFound, "laboratory_not_found", "El laboratorio no existe")
		return
	}

	w.WriteHeader(http.StatusOK)
}
