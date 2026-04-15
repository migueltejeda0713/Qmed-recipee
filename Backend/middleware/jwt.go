package middleware

import (
	"context"
	"encoding/base64"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

type contextKey string

const DoctorEmailKey contextKey = "doctor_email"

var jwtSecret []byte
var encryptKey []byte

func init() {
	godotenv.Load()
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	encryptKey = []byte(os.Getenv("ENCRYPT_KEY"))
}

// GenerateJWT creates and signs the JWT token, then encrypts it.
func GenerateJWT(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"exp":    jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	// Encriptar el token firmado
	return encrypt([]byte(signed)), nil
}

// ValidateJWT protege rutas. Acepta http.HandlerFunc y devuelve http.HandlerFunc.
func ValidateJWT(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, "Token requerido", http.StatusUnauthorized)
			return
		}

		encrypted := strings.TrimPrefix(auth, "Bearer ")
		tokenBytes, err := decrypt(encrypted)
		if err != nil {
			http.Error(w, "Token inválido", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(string(tokenBytes), func(token *jwt.Token) (interface{}, error) {
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

func encrypt(data []byte) string {
	encrypted := make([]byte, len(data))
	for i := range data {
		encrypted[i] = data[i] ^ encryptKey[i%len(encryptKey)]
	}
	return base64.StdEncoding.EncodeToString(encrypted)
}

func decrypt(encoded string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, err
	}

	decrypted := make([]byte, len(data))
	for i := range data {
		decrypted[i] = data[i] ^ encryptKey[i%len(encryptKey)]
	}
	return decrypted, nil
}
