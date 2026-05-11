// handlers/createMedicamento.go
package handlers

import (
	"Qmed-Recipe/db"
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
)

type createMedRequest struct {
	Name         string `json:"medicine_name"`
	IDComponent  string `json:"id_component"`
	IDLaboratory string `json:"id_laboratory"`
}

func CreateMedicamento(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		clientError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Método HTTP no permitido")
		return
	}

	var req createMedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("CreateMedicamento: decode err=%v", err)
		clientError(w, http.StatusBadRequest, "invalid_json", "El cuerpo de la solicitud no es JSON válido")
		return
	}

	id := uuid.New().String()

	dbConn := db.InitDB()

	_, err := dbConn.Exec(
		`INSERT INTO medicine (id_medicine, medicine_name, id_component, id_laboratory)
		 VALUES (UUID_TO_BIN(?, TRUE), ?, UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE))`,
		id, req.Name, req.IDComponent, req.IDLaboratory,
	)
	if err != nil {
		serverError(w, "insert_medicine", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_medicine":   id,
		"medicine_name": req.Name,
		"id_component":  req.IDComponent,
		"id_laboratory": req.IDLaboratory,
	})
}
