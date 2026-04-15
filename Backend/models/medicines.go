package models

type Medicine struct {
	ID           string `json:"id_medicine"`
	MedicineName string `json:"medicine_name"`
	IDComponent  string `json:"id_component"`
	IDLaboratory string `json:"id_laboratory"`
}
