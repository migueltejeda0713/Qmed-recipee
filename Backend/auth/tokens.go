package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func accessTTL() time.Duration {
	if v := os.Getenv("JWT_ACCESS_MINUTES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * time.Minute
		}
	}
	return 15 * time.Minute
}

func RefreshTTL() time.Duration {
	if v := os.Getenv("JWT_REFRESH_DAYS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * 24 * time.Hour
		}
	}
	return 7 * 24 * time.Hour
}

func jwtSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

// GenerateAccessJWT produces an HS256 token with sub=idDoctor, email, jti, iat, exp.
func GenerateAccessJWT(idDoctor, email string) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   idDoctor,
		"email": email,
		"jti":   uuid.NewString(),
		"iat":   jwt.NewNumericDate(now),
		"exp":   jwt.NewNumericDate(now.Add(accessTTL())),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(jwtSecret())
}

// GenerateRandomToken returns base64-url encoded random bytes.
func GenerateRandomToken(numBytes int) (string, error) {
	b := make([]byte, numBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// HashToken returns hex(sha256(token)). Stored in DB; raw token never persisted.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
