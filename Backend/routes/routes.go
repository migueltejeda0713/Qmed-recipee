package routes

import (
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"Qmed-Recipe/handlers"
	"Qmed-Recipe/middleware"

	"github.com/didip/tollbooth"
	"github.com/didip/tollbooth/limiter"
	"github.com/gorilla/mux"
)

var blockedIPs sync.Map

// trustedProxies contiene las IPs de proxies de confianza definidas en TRUSTED_PROXIES
// (separadas por coma). Solo si la petición llega desde una de estas IPs se leen
// los headers X-Real-IP / X-Forwarded-For; de lo contrario se usa RemoteAddr directo.
// Ejemplo: TRUSTED_PROXIES=127.0.0.1,10.0.0.1
var trustedProxies = func() map[string]bool {
	m := map[string]bool{}
	for _, ip := range strings.Split(os.Getenv("TRUSTED_PROXIES"), ",") {
		if t := strings.TrimSpace(ip); t != "" {
			m[t] = true
		}
	}
	return m
}()

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
	remoteIP, _, _ := net.SplitHostPort(r.RemoteAddr)
	if trustedProxies[remoteIP] {
		if ip := r.Header.Get("X-Real-IP"); ip != "" {
			return strings.TrimSpace(ip)
		}
		if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
			return strings.TrimSpace(strings.SplitN(ip, ",", 2)[0])
		}
	}
	return remoteIP
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

	type route struct {
		Path    string
		Handler http.HandlerFunc
		Methods []string
	}
	mutating := []route{
		{"/api/paciente", handlers.InsertPaciente, []string{"POST", "OPTIONS"}},
		{"/api/editpaciente/{id}", handlers.EditPaciente, []string{"PUT", "OPTIONS"}},
		{"/api/deletepacient/{id}", handlers.DeletePaciente, []string{"DELETE", "OPTIONS"}},
		{"/api/activatepacient/{id}", handlers.ActivatePaciente, []string{"PUT", "OPTIONS"}},
		{"/api/medicamento", handlers.CreateMedicamento, []string{"POST", "OPTIONS"}},
		{"/api/deletemedicamento/{id}", handlers.SoftDeleteMedicamento, []string{"DELETE", "OPTIONS"}},
		{"/api/activatemedicamento/{id}", handlers.ActivateMedicamento, []string{"PUT", "OPTIONS"}},
		{"/api/laboratorios", handlers.CreateLaboratorio, []string{"POST", "OPTIONS"}},
		{"/api/deletelaboratorio/{id}", handlers.SoftDeleteLaboratorio, []string{"DELETE", "OPTIONS"}},
		{"/api/activatelaboratorio/{id}", handlers.ActivateLaboratorio, []string{"PUT", "OPTIONS"}},
		{"/api/deletecomponente/{id}", handlers.SoftDeleteComponente, []string{"DELETE", "OPTIONS"}},
		{"/api/activatecomponente/{id}", handlers.ActivateComponente, []string{"PUT", "OPTIONS"}},
		{"/api/componentes", handlers.CreateComponente, []string{"POST", "OPTIONS"}},

		// Prescription templates
		{"/api/prescription-templates", handlers.CreatePrescriptionTemplate, []string{"POST", "OPTIONS"}},
		{"/api/prescription-templates/{id}/inactivate", handlers.InactivatePrescriptionTemplate, []string{"PUT", "OPTIONS"}},
		{"/api/prescription-templates/{id}/activate", handlers.ActivatePrescriptionTemplate, []string{"PUT", "OPTIONS"}},

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

		// Prescription templates
		{"/api/prescription-templates", handlers.ListPrescriptionTemplates, []string{"GET", "OPTIONS"}},

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
