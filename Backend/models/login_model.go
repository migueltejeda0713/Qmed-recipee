package models

type LoginRequest struct {
	Correo   string `json:"correo"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Message string `json:"message"`
	Doctor  string `json:"doctor,omitempty"`
}
