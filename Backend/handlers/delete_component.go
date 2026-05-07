package handlers

import (
	"log"
	"net/http"

	"Qmed-Recipe/db"

	"github.com/gorilla/mux"
)

func SoftDeleteComponente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id := mux.Vars(r)["id"]

	dbConn := db.InitDB()
	defer dbConn.Close()

	result, err := dbConn.Exec(
		`UPDATE component SET row_status_id = 3 WHERE id_component = UUID_TO_BIN(?, TRUE) AND row_status_id = 2`,
		id,
	)
	if err != nil {
		log.Printf("[SoftDeleteComponente] Error: %v", err)
		http.Error(w, "Error deleting component", http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Component not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}
