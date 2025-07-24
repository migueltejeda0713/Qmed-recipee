// handlers/createLaboratorio.go
package handlers

import (
  "Qmed-Recipe/db"
  "encoding/json"
  "log"
  "net/http"
)

// Esperamos recibir JSON: { "nombre_laboratorio": "Nombre XYZ" }
type createLabRequest struct {
  Nombre string `json:"nombre_laboratorio"`
}

func CreateLaboratorio(w http.ResponseWriter, r *http.Request) {
  // CORS
  w.Header().Set("Access-Control-Allow-Origin", "*")
  w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
  w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

  if r.Method == http.MethodOptions {
    w.WriteHeader(http.StatusOK)
    return
  }

  if r.Method != http.MethodPost {
    http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
    return
  }

  var req createLabRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    log.Println("JSON inválido:", err)
    http.Error(w, "JSON inválido", http.StatusBadRequest)
    return
  }

  dbConn := db.InitDB()
  defer dbConn.Close()

  // Insertamos sin id_doctor: se usará valor NULL o el default que quieras
  result, err := dbConn.Exec(
    `INSERT INTO laboratorios (nombre_laboratorio) VALUES (?)`,
    req.Nombre,
  )
  if err != nil {
    log.Println("Error insertando laboratorio:", err)
    http.Error(w, "Error al crear laboratorio", http.StatusInternalServerError)
    return
  }

  id, _ := result.LastInsertId()
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(map[string]interface{}{
    "id_laboratorio": id,
    "nombre":         req.Nombre,
  })
}
