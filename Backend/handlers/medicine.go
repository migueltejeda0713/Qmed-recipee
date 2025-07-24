// handlers/createMedicamento.go
package handlers

import (
    "Qmed-Recipe/db"
    "encoding/json"
    "log"
    "net/http"
    "Qmed-Recipe/models"
)

type createMedRequest struct {
    Nombre        string `json:"nombre_medicamento"`
    IDComponente  int    `json:"id_componente"`
    IDLaboratorio int    `json:"id_laboratorio"`
}

func CreateMedicamento(w http.ResponseWriter, r *http.Request) {
   
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }
    if r.Method != http.MethodPost {
        http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
        return
    }

    var req createMedRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Println("JSON inválido:", err)
        http.Error(w, "JSON inválido", http.StatusBadRequest)
        return
    }

    dbConn := db.InitDB()
    defer dbConn.Close()

    res, err := dbConn.Exec(
        `INSERT INTO medicamentos (nombre_medicamento, id_componente, id_laboratorio)
         VALUES (?, ?, ?)`,
        req.Nombre, req.IDComponente, req.IDLaboratorio,
    )
    if err != nil {
        log.Println("Error insertando medicamento:", err)
        http.Error(w, "Error al crear medicamento", http.StatusInternalServerError)
        return
    }

    id, _ := res.LastInsertId()
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(models.Medicamento{
        IDMedicamento:            int(id),
        NombreMedicamento:        req.Nombre,
        IDComponente:  req.IDComponente,
        IDLaboratorio: req.IDLaboratorio,
    })
}
