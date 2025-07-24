package models



type PacienteInput struct {
	NombrePaciente   string `json:"nombre_paciente"`
	ApellidoPaciente string `json:"apellido_paciente"`
	CedulaPaciente   string `json:"cedula_paciente"`
	TelefonoPaciente string `json:"telefono_paciente"`
	EdadPaciente     string   `json:"fecha_nacimiento"`
	IdAseguradora    int    `json:"id_aseguradora"`
	PolizaPaciente   string `json:"poliza_paciente"`
}
