// routes/routes.go
package routes

import (
	"net/http"

	"Qmed-Recipe/handlers"
	"Qmed-Recipe/middleware"

	"github.com/gorilla/mux"
)

func RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/api/login", handlers.LoginDoctor).Methods("POST", "OPTIONS")

	// Rutas protegidas
secure := []struct {
	Path    string
	Handler http.HandlerFunc
	Methods []string
}{
	{"/api/aseguradoras", handlers.GetAseguradoras, []string{"GET", "OPTIONS"}},
	{"/api/paciente", handlers.InsertPaciente, []string{"POST", "OPTIONS"}},
	{"/api/editpaciente/{id}", handlers.EditPaciente, []string{"PUT", "OPTIONS"}},
	{"/api/pacientes_pag", handlers.GetPacientesPaginados, []string{"GET", "OPTIONS"}},
	{"/api/deletepacient/{id}", handlers.DeletePaciente, []string{"DELETE", "OPTIONS"}},
	{"/api/medicamento",handlers.CreateMedicamento, []string{"POST", "OPTIONS"}},
	{"/api/edit_aseguradora/{id}", handlers.GetPolizaByPaciente, []string{"GET", "OPTIONS"}},
	{"/api/searchpacient", handlers.SearchPacient, []string{"GET", "OPTIONS"}},
	{"/api/laboratorios", handlers.CreateLaboratorio, []string{"POST", "OPTIONS"}},
	{"/api/getcomponentes", handlers.GetComponentesPaginados, []string{"GET", "OPTIONS"}},
	{"/api/getlaboratorios", handlers.GetLaboratorios, []string{"GET", "OPTIONS"}},
	{"/api/searchcomponente", handlers.SearchComponente, []string{"GET", "OPTIONS"}},
	{"/api/componentes", handlers.CreateComponente, []string{"POST", "OPTIONS"}},
}


	for _, route := range secure {
	r.Handle(route.Path,
		middleware.ValidateJWT(http.HandlerFunc(route.Handler)),
	).Methods(route.Methods...)
}

}
