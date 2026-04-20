package middleware

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

type contextKey string

const DoctorEmailKey contextKey = "doctor_email"

var jwtSecret []byte

func init() {
	godotenv.Load()
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
}

func GenerateJWT(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"exp":   jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ValidateJWT(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("auth_token")
		if err != nil {
			http.Error(w, "Token requerido", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "Token inválido", http.StatusUnauthorized)
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if email, ok := claims["email"].(string); ok {
				ctx := context.WithValue(r.Context(), DoctorEmailKey, email)
				r = r.WithContext(ctx)
			}
		}

		next(w, r)
	}
}
