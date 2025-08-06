package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"Qmed-Recipe/db"
	"Qmed-Recipe/models"
)


func SearchPacient(w http.ResponseWriter, r *http.Request) {
	
	if r.Method == http.MethodOptions {
		log.Println("OPTIONS request received at /api/searchpacient")
		w.WriteHeader(http.StatusOK)
		return
	}

	nameQ := r.URL.Query().Get("name")
	limitQ := r.URL.Query().Get("limit")

	// Construcción de la consulta
	baseQuery := `
		SELECT id_pacient, nombre, fecha_nacimiento, documento_paciente, telefono
		FROM paciente
	`
	var args []interface{}

	if nameQ != "" {
		baseQuery += " WHERE MATCH(nombre) AGAINST (? IN NATURAL LANGUAGE MODE)"
		args = append(args, nameQ)
	}

	baseQuery += " ORDER BY id_pacient DESC"

	if limitQ != "" {
		if lim, err := strconv.Atoi(limitQ); err == nil && lim > 0 {
			baseQuery += " LIMIT ?"
			args = append(args, lim)
		} else {
			log.Printf("Parámetro 'limit' inválido: %s, se omitirá límite.\n", limitQ)
		}
	}


	dbConn := db.InitDB()
	defer dbConn.Close()

	rows, err := dbConn.Query(baseQuery, args...)
	if err != nil {
		log.Printf("Error ejecutando la consulta: %v\n", err)
		http.Error(w, "Error ejecutando consulta: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var pacientes []models.PacienteSearchResult
	for rows.Next() {
		var p models.PacienteSearchResult
		var telefonoNull *string

		if err := rows.Scan(&p.ID, &p.Name, &p.FechaNacimiento, &p.Cedula, &telefonoNull); err != nil {
			log.Printf("Error escaneando fila: %v\n", err)
			http.Error(w, "Error escaneando resultados: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if telefonoNull != nil {
			p.Telefono = *telefonoNull
		} else {
			p.Telefono = ""
		}

		pacientes = append(pacientes, p)
	}

	

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pacientes)
}
