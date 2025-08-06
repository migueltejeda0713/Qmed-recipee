package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"Qmed-Recipe/db"
)

type createComponenteRequest struct {
	Nombre string `json:"nombre"`
}

func CreateComponente(w http.ResponseWriter, r *http.Request) {


	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var req createComponenteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("JSON inválido:", err)
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	dbConn := db.InitDB()
	defer dbConn.Close()

	res, err := dbConn.Exec(
		`INSERT INTO componentes (nombre) VALUES (?)`,
		req.Nombre,
	)
	if err != nil {
		log.Println("Error insertando componente:", err)
		http.Error(w, "Error al crear componente", http.StatusInternalServerError)
		return
	}

	id, _ := res.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id_componente": id,
		"nombre":        req.Nombre,
	})
}
