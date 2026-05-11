package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"Qmed-Recipe/db"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

// writeMWError logs to terminal and returns a JSON {error, code} body so the
// frontend can branch on the code (e.g. trigger /auth/refresh on token_expired).
func writeMWError(w http.ResponseWriter, status int, code, msg string) {
	log.Printf("[middleware] %d %s: %s", status, code, msg)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg, "code": code})
}

type contextKey string

const (
	DoctorEmailKey contextKey = "doctor_email"
	DoctorIDKey    contextKey = "doctor_id"
)

var jwtSecret []byte

func init() {
	_ = godotenv.Load()
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
}

// ValidateJWT validates the access_token cookie, puts id_doctor and email in
// request context, and re-checks the doctor's row_status against the DB.
// Returns 401 with WWW-Authenticate header on expired tokens so the frontend
// knows it should attempt /api/auth/refresh.
func ValidateJWT(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("access_token")
		if err != nil {
			writeMWError(w, http.StatusUnauthorized, "missing_token", "Sesión no iniciada")
			return
		}

		token, err := jwt.Parse(cookie.Value,
			func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return jwtSecret, nil
			},
			jwt.WithLeeway(30*time.Second),
		)

		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				w.Header().Set("WWW-Authenticate", `Bearer error="token_expired"`)
				writeMWError(w, http.StatusUnauthorized, "token_expired", "El token de acceso expiró; renueva la sesión")
				return
			}
			log.Printf("[middleware] jwt parse err=%v", err)
			writeMWError(w, http.StatusUnauthorized, "invalid_token", "Token de acceso inválido")
			return
		}
		if !token.Valid {
			writeMWError(w, http.StatusUnauthorized, "invalid_token", "Token de acceso inválido")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeMWError(w, http.StatusUnauthorized, "invalid_token", "Token de acceso inválido")
			return
		}
		idDoctor, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)
		if idDoctor == "" {
			writeMWError(w, http.StatusUnauthorized, "invalid_token", "Token sin identificador de médico")
			return
		}

		// Re-validate row_status (2 = ACTIVE). Doctor flipped to INACTIVE
		// while session was live must be blocked immediately.
		database := db.DB
		if database == nil {
			database = db.InitDB()
		}
		var status uint8
		err = database.QueryRow(
			`SELECT row_status_id FROM doctor WHERE id_doctor = UUID_TO_BIN(?, TRUE)`,
			idDoctor,
		).Scan(&status)
		if err == sql.ErrNoRows {
			writeMWError(w, http.StatusUnauthorized, "account_not_found", "La cuenta ya no existe")
			return
		}
		if err != nil {
			log.Printf("[middleware] doctor status lookup err=%v", err)
			writeMWError(w, http.StatusInternalServerError, "server_error", "Error interno del servidor")
			return
		}
		if status != 2 {
			writeMWError(w, http.StatusForbidden, "account_disabled", "La cuenta está deshabilitada")
			return
		}

		ctx := context.WithValue(r.Context(), DoctorIDKey, idDoctor)
		ctx = context.WithValue(ctx, DoctorEmailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GenerateJWT kept for backwards compat during rollout; will be removed after
// /api/login alias is deleted.
func GenerateJWT(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"exp":   jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(jwtSecret)
}
