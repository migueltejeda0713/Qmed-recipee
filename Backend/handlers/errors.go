package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"runtime"
	"strings"
)

// ErrorPayload is the JSON shape returned for every error response.
// `Error` is a human-readable message (es-CO) safe to display in the UI.
// `Code` is a stable machine-readable identifier the frontend can switch on.
type ErrorPayload struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
}

// callerName returns "package.Func" of the handler that triggered the error,
// so terminal logs identify *where* something failed without a manual tag.
func callerName(skip int) string {
	pc, _, _, ok := runtime.Caller(skip)
	if !ok {
		return "?"
	}
	fn := runtime.FuncForPC(pc)
	if fn == nil {
		return "?"
	}
	name := fn.Name()
	// strip module path, keep "package.Func"
	if i := strings.LastIndex(name, "/"); i >= 0 {
		name = name[i+1:]
	}
	return name
}

// writeJSONError writes {error, code} with the given status.
func writeJSONError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorPayload{Error: msg, Code: code})
}

// clientError logs and returns a 4xx with a specific code + human message.
// Use this for validation / not-found / forbidden errors.
func clientError(w http.ResponseWriter, status int, code, msg string) {
	log.Printf("[%s] %d %s: %s", callerName(2), status, code, msg)
	writeJSONError(w, status, code, msg)
}

// serverError logs the underlying error to terminal and returns a generic 500
// with a stable code. Never leaks internal details to the client.
func serverError(w http.ResponseWriter, op string, err error) {
	log.Printf("[%s] 500 server_error op=%s err=%v", callerName(2), op, err)
	writeJSONError(w, http.StatusInternalServerError, "server_error",
		"Error interno del servidor")
}
