// handlers/getLaboratorios.go
package handlers

import (
    "encoding/json"
    "log"
    "net/http"

    "Qmed-Recipe/db"
    "Qmed-Recipe/models"
)

// GetLaboratorios devuelve todos los laboratorios registrados
func GetLaboratorios(w http.ResponseWriter, r *http.Request) {
    // CORS preflight
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }

    // Cabeceras CORS y JSON
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    w.Header().Set("Content-Type", "application/json")

    dbConn := db.InitDB()
    defer dbConn.Close()

    rows, err := dbConn.Query(`
        SELECT id_laboratorio, nombre_laboratorio
        FROM laboratorios
        ORDER BY id_laboratorio DESC
    `)
    if err != nil {
        log.Printf("Error listando laboratorios: %v\n", err)
        http.Error(w, "Error consultando laboratorios", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var labs []models.Laboratory
    for rows.Next() {
        var l models.Laboratory
        if err := rows.Scan(&l.ID, &l.Nombre); err != nil {
            log.Printf("Scan error laboratorio: %v\n", err)
            continue
        }
        labs = append(labs, l)
    }

    if err := json.NewEncoder(w).Encode(labs); err != nil {
        log.Printf("Error encoding laboratorios JSON: %v\n", err)
    }
}
