package models

type PacienteSearchResult struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
    FechaNacimiento string `json:"fechaNacimiento"`
	Cedula   string `json:"cedula"`
	Telefono string `json:"telefono"`
}
