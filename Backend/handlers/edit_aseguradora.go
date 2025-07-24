package handlers

import (
	"Qmed-Recipe/db"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type PolizaResponse struct {
    NumeroPoliza      string `json:"numero_poliza"`
    IdAseguradora     int    `json:"id_aseguradora"`
    NombreAseguradora string `json:"nombre_aseguradora"`
}

func GetPolizaByPaciente(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    

    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        
        return
    }

    if r.Method != http.MethodGet {
        http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
        
        return
    }

    
    idPaciente, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "ID inválido", http.StatusBadRequest)
        log.Printf("[GetPolizaByPaciente] Error convirtiendo ID '%s' a entero: %v", idStr, err)
        return
    }

    
    dbConn := db.InitDB()
    defer dbConn.Close()
    log.Printf("[GetPolizaByPaciente] Conexión a DB establecida")

    
    query := `
      SELECT 
        ns.numero_poliza,
        ns.id_seguro,
        a.nombre_aseguradora
      FROM paciente p
      LEFT JOIN numero_seguro ns ON p.id_seguro = ns.id_seguro
      LEFT JOIN aseguradoras a ON ns.id_aseguradora = a.id_seguro
      WHERE p.id_pacient = ?
    `
    var numPoliza sql.NullString
    var idAseg sql.NullInt64
    var nomAseg sql.NullString

    err = dbConn.QueryRow(query, idPaciente).Scan(
        &numPoliza,
        &idAseg,
        &nomAseg,
    )
    if err != nil {
        http.Error(w, "Error consultando póliza: "+err.Error(), http.StatusInternalServerError)
        return
    }

    resp := PolizaResponse{}
    if numPoliza.Valid {
        resp.NumeroPoliza = numPoliza.String
    }
    if idAseg.Valid {
        resp.IdAseguradora = int(idAseg.Int64)
    }
    if nomAseg.Valid {
        resp.NombreAseguradora = nomAseg.String
    }

    

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(resp); err != nil {
        log.Printf("[GetPolizaByPaciente] Error encoding JSON: %v", err)
    }
}
