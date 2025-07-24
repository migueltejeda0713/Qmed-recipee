package models

type Medicamento struct {
	IDMedicamento     int    `json:"id_medicamento"`
	NombreMedicamento string `json:"nombre_medicamento"`
	IDComponente      int    `json:"id_componente"`
	IDLaboratorio     int    `json:"id_laboratorio"`
}
