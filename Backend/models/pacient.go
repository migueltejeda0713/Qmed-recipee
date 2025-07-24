package models

type Paciente struct {
	ID             int64  `json:"id"`
	Nombre         string `json:"name"`
	Edad           string `json:"edad"`
	FechaNacimiento string `json:"fecha_nacimiento"`
	Cedula         string `json:"cedula"`
	Telefono       string `json:"telefono"`
	Aseguradora    string `json:"aseguradora"`
	NumeroPoliza   string `json:"numero_poliza"`
}
