package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
	"github.com/google/uuid"
)

type createComponentRequest struct {
	Name string `json:"name"`
}

func CreateComponente(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		clientError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Método HTTP no permitido")
		return
	}

	var req createComponentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("CreateComponente: decode err=%v", err)
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}

	id := uuid.New().String()

	dbConn := db.InitDB()

	_, err := dbConn.Exec(
		`INSERT INTO component (id_component, name) VALUES (UUID_TO_BIN(?, TRUE), ?)`,
		id, req.Name,
	)
	if err != nil {
		serverError(w, "insert_component", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_component": id,
		"name":         req.Name,
	})
}
