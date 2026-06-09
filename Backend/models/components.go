package models

type Component struct {
	ID       string `json:"id_component"`
	Name     string `json:"name"`
	IsActive bool   `json:"is_active"`
}
