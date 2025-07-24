package middleware

import (
	"encoding/base64"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

var jwtSecret []byte
var encryptKey []byte

func init() {
	godotenv.Load()
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	encryptKey = []byte(os.Getenv("ENCRYPT_KEY"))
}

// GenerateJWT crea y firma el token JWT, luego lo encripta.
func GenerateJWT(correo string) (string, error) {
	claims := jwt.MapClaims{
		"correo": correo,
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
