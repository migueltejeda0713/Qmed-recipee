package models

type PatientInput struct {
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	DocumentID   string `json:"document_id"`
	Phone        string `json:"phone"`
	BirthDate    string `json:"birth_date"`
	IDProvider   string `json:"id_provider"`
	PolicyNumber string `json:"policy_number"`
}
