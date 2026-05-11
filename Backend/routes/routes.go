package routes

import (
	"net"
	"net/http"
	"sync"
	"time"

	"Qmed-Recipe/handlers"
	"Qmed-Recipe/middleware"

	"github.com/didip/tollbooth"
	"github.com/didip/tollbooth/limiter"
	"github.com/gorilla/mux"
)

var blockedIPs sync.Map

func blockIP(ip string) {
	blockedIPs.Store(ip, time.Now().Add(time.Hour))
	go func() {
		time.Sleep(time.Hour)
		blockedIPs.Delete(ip)
	}()
}

func BlockedIPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		if expiryRaw, ok := blockedIPs.Load(ip); ok {
			expiry := expiryRaw.(time.Time)
			if time.Now().Before(expiry) {
				http.Error(w, `{"error":"too_many_attempts"}`, http.StatusTooManyRequests)
				return
			}
			blockedIPs.Delete(ip)
		}
		next.ServeHTTP(w, r)
	})
}

func getIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	return ip
}

func RegisterRoutes(r *mux.Router) {
	lmt := tollbooth.NewLimiter(2, &limiter.ExpirableOptions{DefaultExpirationTTL: time.Hour})
	lmt.SetMessage(`{"error":"too_many_attempts"}`)
	lmt.SetMessageContentType("application/json")
	lmt.SetOnLimitReached(func(w http.ResponseWriter, r *http.Request) {
		blockIP(getIP(r))
	})

	loginRateLimited := BlockedIPMiddleware(
		tollbooth.LimitHandler(lmt, http.HandlerFunc(handlers.AuthLogin)),
	)

	r.Handle("/api/auth/login", loginRateLimited).Methods("POST", "OPTIONS")
	r.Handle("/api/auth/refresh", http.HandlerFunc(handlers.AuthRefresh)).Methods("POST", "OPTIONS")
	r.Handle("/api/auth/logout", http.HandlerFunc(handlers.AuthLogout)).Methods("POST", "OPTIONS")
	r.Handle("/api/auth/me", middleware.ValidateJWT(http.HandlerFunc(handlers.AuthMe))).Methods("GET", "OPTIONS")

	r.Handle("/api/login", loginRateLimited).Methods("POST", "OPTIONS")
	r.Handle("/api/logout", http.HandlerFunc(handlers.LogoutDoctor)).Methods("POST", "OPTIONS")

	type route struct {
		Path    string
		Handler http.HandlerFunc
		Methods []string
	}
	mutating := []route{
		{"/api/paciente", handlers.InsertPaciente, []string{"POST", "OPTIONS"}},
		{"/api/editpaciente/{id}", handlers.EditPaciente, []string{"PUT", "OPTIONS"}},
		{"/api/deletepacient/{id}", handlers.DeletePaciente, []string{"DELETE", "OPTIONS"}},
		{"/api/medicamento", handlers.CreateMedicamento, []string{"POST", "OPTIONS"}},
		{"/api/laboratorios", handlers.CreateLaboratorio, []string{"POST", "OPTIONS"}},
		{"/api/deletelaboratorio/{id}", handlers.SoftDeleteLaboratorio, []string{"DELETE", "OPTIONS"}},
		{"/api/deletecomponente/{id}", handlers.SoftDeleteComponente, []string{"DELETE", "OPTIONS"}},
		{"/api/componentes", handlers.CreateComponente, []string{"POST", "OPTIONS"}},

		// Recipes
		{"/api/recipes", handlers.CreateRecipe, []string{"POST", "OPTIONS"}},
		{"/api/recipes/{id}", handlers.UpdateRecipe, []string{"PUT", "OPTIONS"}},
		{"/api/recipes/{id}/issue", handlers.IssueRecipe, []string{"POST", "OPTIONS"}},
		{"/api/recipes/{id}/cancel", handlers.CancelRecipe, []string{"POST", "OPTIONS"}},
		{"/api/recipes/{id}/print", handlers.PrintRecipe, []string{"POST", "OPTIONS"}},
		{"/api/recipes/{id}/prescriptions", handlers.AddPrescription, []string{"POST", "OPTIONS"}},
		{"/api/recipes/{id}/prescriptions/{pid}", handlers.UpdatePrescription, []string{"PUT", "OPTIONS"}},
		{"/api/recipes/{id}/prescriptions/{pid}", handlers.DeletePrescription, []string{"DELETE", "OPTIONS"}},
	}
	readOnly := []route{
		{"/api/aseguradoras", handlers.GetAseguradoras, []string{"GET", "OPTIONS"}},
		{"/api/pacientes_pag", handlers.GetPacientesPaginados, []string{"GET", "OPTIONS"}},
		{"/api/edit_aseguradora/{id}", handlers.GetPolizaByPaciente, []string{"GET", "OPTIONS"}},
		{"/api/searchpacient", handlers.SearchPacient, []string{"GET", "OPTIONS"}},
		{"/api/laboratorios_pag", handlers.GetLaboratoriosPaginados, []string{"GET", "OPTIONS"}},
		{"/api/getcomponentes", handlers.GetComponentesPaginados, []string{"GET", "OPTIONS"}},
		{"/api/searchcomponente", handlers.SearchComponente, []string{"GET", "OPTIONS"}},
		{"/api/searchlaboratorio", handlers.SearchLaboratorio, []string{"GET", "OPTIONS"}},
		{"/api/getmedicines", handlers.GetMedicamentos, []string{"GET", "OPTIONS"}},
		{"/api/searchmedicamento", handlers.SearchMedicamento, []string{"GET", "OPTIONS"}},

		// Recipes
		{"/api/recipes", handlers.ListRecipes, []string{"GET", "OPTIONS"}},
		{"/api/recipes/{id}", handlers.GetRecipe, []string{"GET", "OPTIONS"}},
	}

	for _, rt := range mutating {
		r.Handle(rt.Path, middleware.ValidateJWT(middleware.CSRF(rt.Handler))).Methods(rt.Methods...)
	}
	for _, rt := range readOnly {
		r.Handle(rt.Path, middleware.ValidateJWT(rt.Handler)).Methods(rt.Methods...)
	}
}
