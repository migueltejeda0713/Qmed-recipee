package handlers

import (
    "encoding/json"
    "log"
    "net/http"
    "Qmed-Recipe/db"
)

type MedicamentoResponse struct {
    IDMedicamento     int    `json:"id_medicamento"`
    NombreMedicamento string `json:"nombre_medicamento"`
    NombreComponente  string `json:"nombre_componente"`
    NombreLaboratorio string `json:"nombre_laboratorio"`
}

func GetMedicamentos(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }

    if r.Method != http.MethodGet {
        http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
        return
    }

    dbConn := db.InitDB()
    defer dbConn.Close()

    query := `
        SELECT 
            m.id_medicamento,
            m.nombre_medicamento,
            c.nombre,
            l.nombre_laboratorio 
        FROM medicamentos m
        JOIN componentes c ON m.id_componente = c.id_componente
        JOIN laboratorios l ON m.id_laboratorio = l.id_laboratorio
        ORDER BY m.id_medicamento DESC;
    `

    rows, err := dbConn.Query(query)
    if err != nil {
        log.Println("Error ejecutando SELECT:", err)
        http.Error(w, "Error al obtener medicamentos", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var medicamentos []MedicamentoResponse

    for rows.Next() {
        var m MedicamentoResponse
        if err := rows.Scan(&m.IDMedicamento, &m.NombreMedicamento, &m.NombreComponente, &m.NombreLaboratorio); err != nil {
            log.Println("Error escaneando fila:", err)
            http.Error(w, "Error al leer los datos", http.StatusInternalServerError)
            return
        }
        medicamentos = append(medicamentos, m)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(medicamentos)
}
