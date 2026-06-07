package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"Qmed-Recipe/auth"
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Hash bcrypt válido (cost 12) para normalizar tiempos de respuesta en rutas
// de error de login sin revelar si el email existe en la BD.
const dummyHash = "$2a$12$R9h7cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jKMUe"

// trustedHandlerProxies carga las IPs de proxies de confianza desde TRUSTED_PROXIES.
// Solo se leen X-Real-IP / X-Forwarded-For si la petición llega desde una de estas IPs.
var trustedHandlerProxies = func() map[string]bool {
	m := map[string]bool{}
	for _, ip := range strings.Split(os.Getenv("TRUSTED_PROXIES"), ",") {
		if t := strings.TrimSpace(ip); t != "" {
			m[t] = true
		}
	}
	return m
}()

func clientIP(r *http.Request) string {
	remoteIP, _, _ := net.SplitHostPort(r.RemoteAddr)
	if trustedHandlerProxies[remoteIP] {
		if ip := r.Header.Get("X-Real-IP"); ip != "" {
			return strings.TrimSpace(ip)
		}
		if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
			return strings.TrimSpace(strings.SplitN(ip, ",", 2)[0])
		}
	}
	return remoteIP
}

func writeAuthError(w http.ResponseWriter, status int, code string, retryAfter int) {
	log.Printf("[%s] %d %s retry_after=%d", callerName(2), status, code, retryAfter)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(models.AuthError{Error: code, RetryAfter: retryAfter})
}

func lockoutThreshold() int {
	if v := os.Getenv("LOCKOUT_THRESHOLD"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 5
}

func lockoutDuration() time.Duration {
	if v := os.Getenv("LOCKOUT_MINUTES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * time.Minute
		}
	}
	return 15 * time.Minute
}

// safeAudit inserts an audit event but swallows the error and tolerates a nil DB.
func safeAudit(database *sql.DB, ev *models.AuditEvent) {
	if database == nil {
		return
	}
	_ = auth.InsertAudit(database, ev)
}

func AuthLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var creds models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		writeAuthError(w, http.StatusBadRequest, "bad_request", 0)
		return
	}

	ip := clientIP(r)
	ua := r.Header.Get("User-Agent")
	database := db.DB // may be nil in test contexts; init paths use it directly

	// Empty email shortcut. Still run bcrypt dummy to keep timing consistent.
	if creds.Email == "" {
		bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(creds.Password))
		safeAudit(database, &models.AuditEvent{
			EmailTried: "", EventType: models.AuditLoginFail, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusUnauthorized, "invalid_credentials", 0)
		return
	}

	// Past this point we need DB. Init if not already.
	if database == nil {
		database = db.InitDB()
	}

	var idDoctor string
	var storedHash string
	var statusID uint8
	err := database.QueryRow(`
		SELECT BIN_TO_UUID(id_doctor, TRUE), password, row_status_id
		FROM doctor WHERE email = ?`, creds.Email,
	).Scan(&idDoctor, &storedHash, &statusID)

	if err == sql.ErrNoRows {
		bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(creds.Password))
		safeAudit(database, &models.AuditEvent{
			EmailTried: creds.Email, EventType: models.AuditLoginFail, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusUnauthorized, "invalid_credentials", 0)
		return
	}
	if err != nil {
		log.Printf("login query error: %v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	// Lockout check
	if lockout, err := auth.GetLockout(database, idDoctor); err == nil &&
		lockout != nil && lockout.LockedUntil != nil &&
		lockout.LockedUntil.After(time.Now()) {
		retry := int(time.Until(*lockout.LockedUntil).Seconds())
		safeAudit(database, &models.AuditEvent{
			IDDoctor: &idDoctor, EmailTried: creds.Email,
			EventType: models.AuditLoginFail, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusLocked, "account_locked", retry)
		return
	}

	// row_status check (2 = ACTIVE)
	if statusID != 2 {
		safeAudit(database, &models.AuditEvent{
			IDDoctor: &idDoctor, EmailTried: creds.Email,
			EventType: models.AuditLoginFail, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusForbidden, "account_disabled", 0)
		return
	}

	// Compare password
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(creds.Password)); err != nil {
		locked, _ := auth.RegisterFail(database, idDoctor, lockoutThreshold(), lockoutDuration())
		evType := models.AuditLoginFail
		if locked {
			evType = models.AuditLockout
		}
		safeAudit(database, &models.AuditEvent{
			IDDoctor: &idDoctor, EmailTried: creds.Email,
			EventType: evType, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusUnauthorized, "invalid_credentials", 0)
		return
	}

	// Success
	_ = auth.ResetLockout(database, idDoctor)

	accessTok, err := auth.GenerateAccessJWT(idDoctor, creds.Email)
	if err != nil {
		log.Printf("AuthLogin: GenerateAccessJWT err=%v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}
	refreshRaw, err := auth.GenerateRandomToken(32)
	if err != nil {
		log.Printf("AuthLogin: GenerateRandomToken(refresh) err=%v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}
	csrfRaw, err := auth.GenerateRandomToken(32)
	if err != nil {
		log.Printf("AuthLogin: GenerateRandomToken(csrf) err=%v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	family := uuid.NewString()
	if err := auth.InsertRefresh(database, idDoctor, family, auth.HashToken(refreshRaw),
		time.Now().Add(auth.RefreshTTL()), ua, ip); err != nil {
		log.Printf("insert refresh error: %v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	auth.SetAuthCookies(w, accessTok, refreshRaw, csrfRaw)

	safeAudit(database, &models.AuditEvent{
		IDDoctor: &idDoctor, EmailTried: creds.Email,
		EventType: models.AuditLoginOK, IP: ip, UserAgent: ua,
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
