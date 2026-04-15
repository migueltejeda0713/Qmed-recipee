package models

type Patient struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Age          string `json:"age"`
	BirthDate    string `json:"birth_date"`
	DocumentID   string `json:"document_id"`
	Phone        string `json:"phone"`
	Provider     string `json:"provider"`
	PolicyNumber string `json:"policy_number"`
}
