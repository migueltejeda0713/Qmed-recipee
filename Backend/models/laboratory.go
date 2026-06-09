package models

type Laboratory struct {
	ID       string `json:"id_laboratory"`
	Name     string `json:"laboratory_name"`
	IsActive bool   `json:"is_active"`
}
