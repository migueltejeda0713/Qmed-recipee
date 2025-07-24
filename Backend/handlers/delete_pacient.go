package handlers

import (
    "Qmed-Recipe/db"
    "log"
    "net/http"
    "strconv"

    "github.com/gorilla/mux"
)

func DeletePaciente(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    

    
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        
        return
    }

    if r.Method != http.MethodDelete {
        http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
        log.Printf("[DeletePaciente] Método no permitido: %s", r.Method)
        return
    }

   
    idPaciente, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "ID inválido", http.StatusBadRequest)
        
        return
    }

    
    dbConn := db.InitDB()
    defer dbConn.Close()

    
    query := `DELETE FROM paciente WHERE id_pacient = ?`
    result, err := dbConn.Exec(query, idPaciente)
    if err != nil {
        http.Error(w, "Error al eliminar paciente", http.StatusInternalServerError)
        log.Printf("[DeletePaciente] Error ejecutando DELETE: %v", err)
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        http.Error(w, "Paciente no encontrado", http.StatusNotFound)
        log.Printf("[DeletePaciente] Paciente con ID %d no encontrado", idPaciente)
        return
    }

   
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Paciente eliminado correctamente"))
    
}
