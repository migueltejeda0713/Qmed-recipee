package routes

import (
	"net"
	"net/http"
	"sync"
	"time"

	"Qmed-Recipe/handlers"
	"Qmed-Recipe/middleware"

	"github.com/gorilla/mux"
	"github.com/didip/tollbooth"
	"github.com/didip/tollbooth/limiter"
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
				http.Error(w, `{"error":"Has sido bloqueado por exceder el límite de intentos. Intenta nuevamente en una hora."}`, http.StatusTooManyRequests)
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
	lmt.SetMessage(`{"error":"Has sobrepasado la cantidad de intentos. Intenta nuevamente en una hora."}`)
	lmt.SetMessageContentType("application/json")


	lmt.SetOnLimitReached(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		blockIP(ip)
	})

	r.Handle("/api/login",
		BlockedIPMiddleware(tollbooth.LimitHandler(lmt, http.HandlerFunc(handlers.LoginDoctor))),
	).Methods("POST", "OPTIONS")

	
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
		{"/api/medicamento", handlers.CreateMedicamento, []string{"POST", "OPTIONS"}},
		{"/api/edit_aseguradora/{id}", handlers.GetPolizaByPaciente, []string{"GET", "OPTIONS"}},
		{"/api/searchpacient", handlers.SearchPacient, []string{"GET", "OPTIONS"}},
		{"/api/laboratorios", handlers.CreateLaboratorio, []string{"POST", "OPTIONS"}},
		{"/api/getcomponentes", handlers.GetComponentesPaginados, []string{"GET", "OPTIONS"}},
		{"/api/getlaboratorios", handlers.GetLaboratorios, []string{"GET", "OPTIONS"}},
		{"/api/searchcomponente", handlers.SearchComponente, []string{"GET", "OPTIONS"}},
		{"/api/componentes", handlers.CreateComponente, []string{"POST", "OPTIONS"}},
		{"/api/getmedicines", handlers.GetMedicamentos, []string{"GET", "OPTIONS"}},
	}

	for _, route := range secure {
		r.Handle(route.Path,
			middleware.ValidateJWT(http.HandlerFunc(route.Handler)),
		).Methods(route.Methods...)
	}
}
