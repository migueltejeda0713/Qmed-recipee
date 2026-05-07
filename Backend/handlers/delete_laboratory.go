package handlers

import (
	"log"
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
	defer dbConn.Close()

	result, err := dbConn.Exec(
		`UPDATE laboratory SET row_status_id = 3 WHERE id_laboratory = UUID_TO_BIN(?, TRUE) AND row_status_id = 2`,
		id,
	)
	if err != nil {
		log.Printf("[SoftDeleteLaboratorio] Error: %v", err)
		http.Error(w, "Error deleting laboratory", http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Laboratory not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}
