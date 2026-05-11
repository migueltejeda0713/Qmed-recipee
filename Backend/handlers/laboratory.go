// handlers/createLaboratorio.go
package handlers

import (
	"Qmed-Recipe/db"
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
)

type createLabRequest struct {
	Name string `json:"laboratory_name"`
}

func CreateLaboratorio(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		clientError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Método HTTP no permitido")
		return
	}

	var req createLabRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("CreateLaboratorio: decode err=%v", err)
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}

	id := uuid.New().String()

	dbConn := db.InitDB()

	_, err := dbConn.Exec(
		`INSERT INTO laboratory (id_laboratory, laboratory_name) VALUES (UUID_TO_BIN(?, TRUE), ?)`,
		id, req.Name,
	)
	if err != nil {
		serverError(w, "insert_laboratory", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_laboratory": id,
		"name":          req.Name,
	})
}
