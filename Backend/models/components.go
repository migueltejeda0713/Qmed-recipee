package models

// Componente representa la tabla componentes (sin id_doctor por ahora)
type Componente struct {
    ID     int    `json:"id_componente"`
    Nombre string `json:"nombre"`
}
