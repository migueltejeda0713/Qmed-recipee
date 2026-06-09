package handlers

import (
	"net/http"

	"Qmed-Recipe/db"

	"github.com/gorilla/mux"
)

func ActivateComponente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id := mux.Vars(r)["id"]
	dbConn := db.InitDB()

	result, err := dbConn.Exec(
		`UPDATE component SET row_status_id = 2 WHERE id_component = UUID_TO_BIN(?, TRUE) AND row_status_id = 3`,
		id,
	)
	if err != nil {
		serverError(w, "activate_component", err)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		clientError(w, http.StatusNotFound, "component_not_found", "El componente no existe o ya está activo")
		return
	}

	w.WriteHeader(http.StatusOK)
}
