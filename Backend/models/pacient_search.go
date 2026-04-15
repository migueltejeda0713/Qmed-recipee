package models

type PatientSearchResult struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	BirthDate  string `json:"birthDate"`
	DocumentID string `json:"document_id"`
	Phone      string `json:"phone"`
}
