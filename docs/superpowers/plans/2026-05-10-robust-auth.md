# Robust Auth Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el login JWT-único + flag `sessionStorage` por un sistema con access/refresh rotantes, lockout por cuenta, CSRF double-submit, audit log y un `/api/auth/me` autoritativo.

**Architecture:** Backend Go con tres tablas nuevas (`refresh_token`, `login_lockout`, `auth_audit`); cuatro endpoints nuevos (`/api/auth/login|refresh|logout|me`); middleware JWT actualizado (carga `id_doctor`, valida `row_status`) y nuevo middleware CSRF. Frontend con `AuthContext` + `ProtectedRoute` + interceptor axios.

**Tech Stack:** Go 1.25 (gorilla/mux, golang-jwt/v5, golang.org/x/crypto/bcrypt, DATA-DOG/go-sqlmock para tests), MySQL 8, React 19, axios, vitest + @testing-library/react + msw.

**Spec:** [`docs/superpowers/specs/2026-05-10-robust-auth-design.md`](../specs/2026-05-10-robust-auth-design.md)

---

## File Structure

**Backend (Go):**
- Create: `Backend/db/migrations/2026-05-10-auth-tables.sql` — DDL nuevas tablas
- Create: `Backend/models/auth_models.go` — DTOs (`LoginRequest`, `MeResponse`, etc.)
- Create: `Backend/auth/tokens.go` — generación de access/refresh/csrf + hashing
- Create: `Backend/auth/tokens_test.go`
- Create: `Backend/auth/cookies.go` — helpers para setear/borrar las 3 cookies
- Create: `Backend/auth/cookies_test.go`
- Create: `Backend/auth/refresh_repo.go` — Insert/FindByHash/MarkUsed/RevokeFamily
- Create: `Backend/auth/refresh_repo_test.go`
- Create: `Backend/auth/lockout_repo.go` — Get/IncrementFail/Reset
- Create: `Backend/auth/lockout_repo_test.go`
- Create: `Backend/auth/audit_repo.go` — InsertEvent
- Create: `Backend/auth/audit_repo_test.go`
- Create: `Backend/handlers/auth_login.go`
- Create: `Backend/handlers/auth_login_test.go`
- Create: `Backend/handlers/auth_refresh.go`
- Create: `Backend/handlers/auth_refresh_test.go`
- Create: `Backend/handlers/auth_logout.go`
- Create: `Backend/handlers/auth_logout_test.go`
- Create: `Backend/handlers/auth_me.go`
- Create: `Backend/handlers/auth_me_test.go`
- Create: `Backend/middleware/csrf.go`
- Create: `Backend/middleware/csrf_test.go`
- Modify: `Backend/middleware/jwt.go` — leer `auth_token` (nuevo nombre), poner `id_doctor` en ctx, re-validar `row_status`
- Modify: `Backend/middleware/jwt_test.go` (crear)
- Modify: `Backend/routes/routes.go` — wirear `/api/auth/*` y aplicar CSRF middleware a mutaciones
- Modify: `Backend/handlers/login.go` — convertir en alias delgado a `handlers.AuthLogin` (transitorio)
- Modify: `Backend/handlers/logout.go` — alias a `handlers.AuthLogout` (transitorio)
- Modify: `Backend/go.mod` / `go.sum` — añadir `github.com/DATA-DOG/go-sqlmock v1.5.2`

**Frontend (React):**
- Create: `src/utils/csrf.js` — `getCsrfToken()`
- Modify: `src/utils/api.jsx` — exportar instancia axios con interceptors
- Modify: `src/utils/auth.jsx` — rewrite (sin sessionStorage)
- Create: `src/context/AuthContext.jsx` — provider + hook
- Create: `src/components/ProtectedRoute.jsx`
- Modify: `src/Pages/Login.jsx` — usar `useAuth().login`, errores diferenciados
- Modify: `src/components/SidebarMenu.jsx` — usar `useAuth().logout`
- Modify: `src/App.jsx` — envolver con `<AuthProvider>` + `<ProtectedRoute>`
- Create: `vitest.config.js` + `src/test/setup.js` + `src/test/handlers.js` (MSW)
- Create: tests `src/context/AuthContext.test.jsx`, `src/components/ProtectedRoute.test.jsx`, `src/utils/api.test.js`
- Modify: `package.json` — añadir devDeps `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw`, script `test`

---

## Task 1: Database migration (3 new tables)

**Files:**
- Create: `Backend/db/migrations/2026-05-10-auth-tables.sql`

- [ ] **Step 1: Crear el archivo de migración**

Contenido completo de `Backend/db/migrations/2026-05-10-auth-tables.sql`:

```sql
-- Auth hardening — 2026-05-10
-- Tres tablas: refresh_token (rotación), login_lockout (5 fallos → 15min),
-- auth_audit (forensics). Todas con FK a doctor.

USE rctm;

CREATE TABLE refresh_token (
    id_token        BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_doctor       BINARY(16)   NOT NULL,
    id_family       BINARY(16)   NOT NULL,
    token_hash      CHAR(64)     NOT NULL,
    issued_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NOT NULL,
    used_at         TIMESTAMP        NULL,
    revoked_at      TIMESTAMP        NULL,
    user_agent      VARCHAR(255)     NULL,
    ip              VARCHAR(45)      NULL,

    UNIQUE KEY uq_token_hash (token_hash),
    INDEX idx_family (id_family),
    INDEX idx_doctor_active (id_doctor, revoked_at),
    CONSTRAINT fk_refresh_doctor FOREIGN KEY (id_doctor)
        REFERENCES doctor (id_doctor) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE login_lockout (
    id_doctor       BINARY(16)        NOT NULL PRIMARY KEY,
    failed_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until    TIMESTAMP             NULL,
    last_failed_at  TIMESTAMP             NULL,

    CONSTRAINT fk_lockout_doctor FOREIGN KEY (id_doctor)
        REFERENCES doctor (id_doctor) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_audit (
    id_event    BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_doctor   BINARY(16)            NULL,
    email_tried VARCHAR(255)      NOT NULL,
    event_type  ENUM('LOGIN_OK','LOGIN_FAIL','LOCKOUT','REFRESH_OK',
                     'REFRESH_REUSE','LOGOUT') NOT NULL,
    ip          VARCHAR(45)       NOT NULL,
    user_agent  VARCHAR(255)          NULL,
    created_at  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_doctor (id_doctor),
    INDEX idx_audit_email_time (email_tried, created_at),
    CONSTRAINT fk_audit_doctor FOREIGN KEY (id_doctor)
        REFERENCES doctor (id_doctor) ON DELETE SET NULL
) ENGINE=InnoDB;
```

- [ ] **Step 2: Aplicar la migración localmente**

Run:
```bash
mysql -u $DB_USER -p$DB_PASSWORD rctm < Backend/db/migrations/2026-05-10-auth-tables.sql
```
Expected: sin errores. Verificar con:
```bash
mysql -u $DB_USER -p$DB_PASSWORD -e "USE rctm; SHOW TABLES LIKE '%token%'; SHOW TABLES LIKE 'login_lockout'; SHOW TABLES LIKE 'auth_audit';"
```
Expected: lista de tablas `refresh_token`, `login_lockout`, `auth_audit`.

- [ ] **Step 3: Commit**

```bash
git add Backend/db/migrations/2026-05-10-auth-tables.sql
git commit -m "feat(auth): add refresh_token, login_lockout, auth_audit tables"
```

---

## Task 2: Models y env config

**Files:**
- Create: `Backend/models/auth_models.go`
- Modify: `Backend/models/login_model.go` (dejar `LoginRequest`, eliminar `LoginResponse`)

- [ ] **Step 1: Crear `Backend/models/auth_models.go`**

```go
package models

import "time"

type MeResponse struct {
	IDDoctor  string `json:"id_doctor"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Specialty string `json:"specialty,omitempty"`
}

type AuthError struct {
	Error      string `json:"error"`
	RetryAfter int    `json:"retry_after,omitempty"`
}

type RefreshTokenRow struct {
	IDToken    string
	IDDoctor   string
	IDFamily   string
	TokenHash  string
	IssuedAt   time.Time
	ExpiresAt  time.Time
	UsedAt     *time.Time
	RevokedAt  *time.Time
	UserAgent  *string
	IP         *string
}

type LockoutRow struct {
	IDDoctor     string
	FailedCount  int
	LockedUntil  *time.Time
	LastFailedAt *time.Time
}

type AuditEventType string

const (
	AuditLoginOK     AuditEventType = "LOGIN_OK"
	AuditLoginFail   AuditEventType = "LOGIN_FAIL"
	AuditLockout     AuditEventType = "LOCKOUT"
	AuditRefreshOK   AuditEventType = "REFRESH_OK"
	AuditRefreshReuse AuditEventType = "REFRESH_REUSE"
	AuditLogout      AuditEventType = "LOGOUT"
)
```

- [ ] **Step 2: Limpiar `Backend/models/login_model.go`**

Reemplazar contenido completo:

```go
package models

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd Backend && go build ./...`
Expected: sin errores (puede fallar en `handlers/login.go` por `LoginResponse` no usado — eso se arregla en Task 9).

Si falla por `LoginResponse`, dejar temporalmente el tipo viejo en `login_model.go`:

```go
package models

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Message string `json:"message"`
	Doctor  string `json:"doctor,omitempty"`
}
```

Se elimina en Task 9.

- [ ] **Step 4: Commit**

```bash
git add Backend/models/
git commit -m "feat(auth): add MeResponse, AuthError, RefreshTokenRow, LockoutRow models"
```

---

## Task 3: Token generation helpers (TDD)

**Files:**
- Create: `Backend/auth/tokens.go`
- Create: `Backend/auth/tokens_test.go`

- [ ] **Step 1: Añadir sqlmock como dep**

Run:
```bash
cd Backend && go get github.com/DATA-DOG/go-sqlmock@v1.5.2
```
Expected: añade entrada en `go.mod`.

- [ ] **Step 2: Escribir el test fallido**

Crear `Backend/auth/tokens_test.go`:

```go
package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateAccessJWT_ContainsClaims(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	tok, err := GenerateAccessJWT("11111111-1111-1111-1111-111111111111", "doc@x.com")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	parsed, err := jwt.Parse(tok, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("token not valid: %v", err)
	}
	claims := parsed.Claims.(jwt.MapClaims)
	if claims["sub"] != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("sub mismatch: %v", claims["sub"])
	}
	if claims["email"] != "doc@x.com" {
		t.Errorf("email mismatch: %v", claims["email"])
	}
	if _, ok := claims["jti"]; !ok {
		t.Error("missing jti")
	}
}

func TestGenerateRandomToken_Length(t *testing.T) {
	tok, err := GenerateRandomToken(32)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(tok) < 40 {
		t.Errorf("token too short: %d", len(tok))
	}
	if strings.ContainsAny(tok, "+/=") {
		t.Errorf("expected url-safe b64, got: %s", tok)
	}
}

func TestHashToken_Stable(t *testing.T) {
	h1 := HashToken("abc")
	h2 := HashToken("abc")
	if h1 != h2 {
		t.Error("hash not stable")
	}
	if len(h1) != hex.EncodedLen(sha256.Size) {
		t.Errorf("expected %d chars, got %d", hex.EncodedLen(sha256.Size), len(h1))
	}
}

func TestAccessTokenTTL_DefaultsTo15Min(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	os.Unsetenv("JWT_ACCESS_MINUTES")
	tok, _ := GenerateAccessJWT("u", "e")
	parsed, _ := jwt.Parse(tok, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	claims := parsed.Claims.(jwt.MapClaims)
	exp := int64(claims["exp"].(float64))
	delta := time.Unix(exp, 0).Sub(time.Now())
	if delta < 14*time.Minute || delta > 16*time.Minute {
		t.Errorf("expected ~15min, got %v", delta)
	}
}
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `cd Backend && go test ./auth/...`
Expected: FAIL "no Go files" o "undefined: GenerateAccessJWT".

- [ ] **Step 4: Implementar `Backend/auth/tokens.go`**

```go
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
```

- [ ] **Step 5: Correr test (debe pasar)**

Run: `cd Backend && go test ./auth/... -v`
Expected: PASS 4 tests.

- [ ] **Step 6: Commit**

```bash
git add Backend/auth/tokens.go Backend/auth/tokens_test.go Backend/go.mod Backend/go.sum
git commit -m "feat(auth): add token generation helpers with tests"
```

---

## Task 4: Cookie helpers (TDD)

**Files:**
- Create: `Backend/auth/cookies.go`
- Create: `Backend/auth/cookies_test.go`

- [ ] **Step 1: Escribir test fallido**

Crear `Backend/auth/cookies_test.go`:

```go
package auth

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestSetAuthCookies_AllThreeCookiesPresent(t *testing.T) {
	os.Setenv("APP_ENV", "production")
	rec := httptest.NewRecorder()
	SetAuthCookies(rec, "access.jwt.value", "refresh-opaque-value", "csrf-random")

	cookies := rec.Result().Cookies()
	names := map[string]*http.Cookie{}
	for _, c := range cookies {
		names[c.Name] = c
	}

	if names["access_token"] == nil || names["refresh_token"] == nil || names["csrf_token"] == nil {
		t.Fatalf("missing cookies, got: %v", names)
	}
	if !names["access_token"].HttpOnly {
		t.Error("access_token must be HttpOnly")
	}
	if !names["refresh_token"].HttpOnly {
		t.Error("refresh_token must be HttpOnly")
	}
	if names["csrf_token"].HttpOnly {
		t.Error("csrf_token must NOT be HttpOnly (frontend needs to read it)")
	}
	if !names["access_token"].Secure {
		t.Error("Secure must be true in production")
	}
	if names["refresh_token"].Path != "/api/auth" {
		t.Errorf("refresh_token path must be /api/auth, got %s", names["refresh_token"].Path)
	}
	if names["access_token"].SameSite != http.SameSiteStrictMode {
		t.Error("SameSite must be Strict")
	}
}

func TestClearAuthCookies_AllExpired(t *testing.T) {
	rec := httptest.NewRecorder()
	ClearAuthCookies(rec)
	got := rec.Header().Get("Set-Cookie")
	for _, name := range []string{"access_token", "refresh_token", "csrf_token"} {
		if !strings.Contains(got, name+"=") {
			t.Errorf("missing clear for %s in %s", name, got)
		}
	}
	if !strings.Contains(got, "Max-Age=0") {
		t.Errorf("expected Max-Age=0 in headers: %s", got)
	}
}
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `cd Backend && go test ./auth/... -run Cookies`
Expected: FAIL "undefined: SetAuthCookies".

- [ ] **Step 3: Implementar `Backend/auth/cookies.go`**

```go
package auth

import (
	"net/http"
	"os"
	"time"
)

func isSecure() bool {
	return os.Getenv("APP_ENV") == "production"
}

func SetAuthCookies(w http.ResponseWriter, access, refresh, csrf string) {
	secure := isSecure()

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    access,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		MaxAge:   int(accessTTL().Seconds()),
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refresh,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   int(RefreshTTL().Seconds()),
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    csrf,
		HttpOnly: false,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		MaxAge:   int(RefreshTTL().Seconds()),
	})
}

func ClearAuthCookies(w http.ResponseWriter) {
	secure := isSecure()
	paths := map[string]string{
		"access_token":  "/",
		"refresh_token": "/api/auth",
		"csrf_token":    "/",
	}
	for name, path := range paths {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			HttpOnly: name != "csrf_token",
			Secure:   secure,
			SameSite: http.SameSiteStrictMode,
			Path:     path,
			MaxAge:   -1,
			Expires:  time.Unix(0, 0),
		})
	}
}
```

- [ ] **Step 4: Correr test (debe pasar)**

Run: `cd Backend && go test ./auth/... -v -run Cookies`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Backend/auth/cookies.go Backend/auth/cookies_test.go
git commit -m "feat(auth): cookie helpers (set 3 cookies, clear all)"
```

---

## Task 5: Refresh token repository (TDD with sqlmock)

**Files:**
- Create: `Backend/auth/refresh_repo.go`
- Create: `Backend/auth/refresh_repo_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package auth

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestInsertRefresh_RunsExpectedInsert(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`INSERT INTO refresh_token`).
		WithArgs("doctor-uuid", "family-uuid", "hashvalue", sqlmock.AnyArg(), "ua", "1.2.3.4").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := InsertRefresh(db, "doctor-uuid", "family-uuid", "hashvalue",
		time.Now().Add(7*24*time.Hour), "ua", "1.2.3.4")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestFindRefreshByHash_ReturnsRow(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	rows := sqlmock.NewRows([]string{
		"id_token", "id_doctor", "id_family", "token_hash",
		"issued_at", "expires_at", "used_at", "revoked_at",
	}).AddRow("tok", "doc", "fam", "hash",
		time.Now(), time.Now().Add(time.Hour), nil, nil)

	mock.ExpectQuery(`SELECT .*FROM refresh_token WHERE token_hash`).
		WithArgs("hash").
		WillReturnRows(rows)

	row, err := FindRefreshByHash(db, "hash")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if row.IDDoctor != "doc" || row.IDFamily != "fam" {
		t.Errorf("unexpected row: %+v", row)
	}
}

func TestMarkRefreshUsed_UpdatesUsedAt(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`UPDATE refresh_token SET used_at`).
		WithArgs("tok").
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := MarkRefreshUsed(db, "tok"); err != nil {
		t.Fatalf("err: %v", err)
	}
}

func TestRevokeFamily_UpdatesAllInFamily(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`UPDATE refresh_token SET revoked_at .*WHERE id_family`).
		WithArgs("fam").
		WillReturnResult(sqlmock.NewResult(0, 3))

	if err := RevokeFamily(db, "fam"); err != nil {
		t.Fatalf("err: %v", err)
	}
}
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `cd Backend && go test ./auth/... -run Refresh`
Expected: FAIL "undefined: InsertRefresh".

- [ ] **Step 3: Implementar `Backend/auth/refresh_repo.go`**

```go
package auth

import (
	"database/sql"
	"time"

	"Qmed-Recipe/models"
)

func InsertRefresh(db *sql.DB, idDoctor, idFamily, tokenHash string,
	expiresAt time.Time, userAgent, ip string) error {
	_, err := db.Exec(`
		INSERT INTO refresh_token
		  (id_doctor, id_family, token_hash, expires_at, user_agent, ip)
		VALUES (UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?, ?, ?, ?)`,
		idDoctor, idFamily, tokenHash, expiresAt, userAgent, ip)
	return err
}

func FindRefreshByHash(db *sql.DB, tokenHash string) (*models.RefreshTokenRow, error) {
	var row models.RefreshTokenRow
	var usedAt, revokedAt sql.NullTime
	err := db.QueryRow(`
		SELECT BIN_TO_UUID(id_token, TRUE), BIN_TO_UUID(id_doctor, TRUE),
		       BIN_TO_UUID(id_family, TRUE), token_hash,
		       issued_at, expires_at, used_at, revoked_at
		FROM refresh_token WHERE token_hash = ?`,
		tokenHash,
	).Scan(&row.IDToken, &row.IDDoctor, &row.IDFamily, &row.TokenHash,
		&row.IssuedAt, &row.ExpiresAt, &usedAt, &revokedAt)
	if err != nil {
		return nil, err
	}
	if usedAt.Valid {
		row.UsedAt = &usedAt.Time
	}
	if revokedAt.Valid {
		row.RevokedAt = &revokedAt.Time
	}
	return &row, nil
}

func MarkRefreshUsed(db *sql.DB, idToken string) error {
	_, err := db.Exec(`UPDATE refresh_token SET used_at = NOW() WHERE id_token = UUID_TO_BIN(?, TRUE)`, idToken)
	return err
}

func RevokeFamily(db *sql.DB, idFamily string) error {
	_, err := db.Exec(`UPDATE refresh_token SET revoked_at = NOW() WHERE id_family = UUID_TO_BIN(?, TRUE) AND revoked_at IS NULL`, idFamily)
	return err
}

func RevokeToken(db *sql.DB, idToken string) error {
	_, err := db.Exec(`UPDATE refresh_token SET revoked_at = NOW() WHERE id_token = UUID_TO_BIN(?, TRUE)`, idToken)
	return err
}
```

**Nota:** los tests pasan los UUIDs como strings simples (sin convertir a binary). Los `sqlmock` matchers usan regex, así que los placeholders `UUID_TO_BIN(?, TRUE)` matchean. En tests reales contra MySQL real, los UUIDs deben ser válidos.

- [ ] **Step 4: Correr test**

Run: `cd Backend && go test ./auth/... -v -run Refresh`
Expected: PASS 4.

- [ ] **Step 5: Commit**

```bash
git add Backend/auth/refresh_repo.go Backend/auth/refresh_repo_test.go
git commit -m "feat(auth): refresh token repository (insert/find/mark/revoke)"
```

---

## Task 6: Lockout repository (TDD)

**Files:**
- Create: `Backend/auth/lockout_repo.go`
- Create: `Backend/auth/lockout_repo_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package auth

import (
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestGetLockout_NotExistReturnsZero(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectQuery(`SELECT .*FROM login_lockout WHERE id_doctor`).
		WithArgs("doc").
		WillReturnError(sql.ErrNoRows)

	row, err := GetLockout(db, "doc")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if row.FailedCount != 0 || row.LockedUntil != nil {
		t.Errorf("expected empty lockout, got %+v", row)
	}
}

func TestRegisterFail_FirstFailInsertsCountOne(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`INSERT INTO login_lockout`).
		WithArgs("doc").
		WillReturnResult(sqlmock.NewResult(1, 1))

	locked, err := RegisterFail(db, "doc", 5, 15*time.Minute)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if locked {
		t.Error("first fail must not lock")
	}
}

func TestResetLockout_DeletesRow(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`DELETE FROM login_lockout WHERE id_doctor`).
		WithArgs("doc").
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := ResetLockout(db, "doc"); err != nil {
		t.Fatalf("err: %v", err)
	}
}
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `cd Backend && go test ./auth/... -run Lockout`
Expected: FAIL "undefined".

- [ ] **Step 3: Implementar `Backend/auth/lockout_repo.go`**

```go
package auth

import (
	"database/sql"
	"time"

	"Qmed-Recipe/models"
)

func GetLockout(db *sql.DB, idDoctor string) (*models.LockoutRow, error) {
	var row models.LockoutRow
	var lockedUntil, lastFailedAt sql.NullTime
	err := db.QueryRow(`
		SELECT failed_count, locked_until, last_failed_at
		FROM login_lockout WHERE id_doctor = UUID_TO_BIN(?, TRUE)`,
		idDoctor,
	).Scan(&row.FailedCount, &lockedUntil, &lastFailedAt)
	if err == sql.ErrNoRows {
		return &models.LockoutRow{IDDoctor: idDoctor}, nil
	}
	if err != nil {
		return nil, err
	}
	row.IDDoctor = idDoctor
	if lockedUntil.Valid {
		row.LockedUntil = &lockedUntil.Time
	}
	if lastFailedAt.Valid {
		row.LastFailedAt = &lastFailedAt.Time
	}
	return &row, nil
}

// RegisterFail increments failed_count for this doctor. If reaching threshold,
// sets locked_until = NOW() + duration and returns locked=true.
// Uses INSERT ... ON DUPLICATE KEY UPDATE for atomic increment.
func RegisterFail(db *sql.DB, idDoctor string, threshold int, lockDuration time.Duration) (bool, error) {
	lockSeconds := int(lockDuration.Seconds())
	_, err := db.Exec(`
		INSERT INTO login_lockout (id_doctor, failed_count, last_failed_at)
		VALUES (UUID_TO_BIN(?, TRUE), 1, NOW())
		ON DUPLICATE KEY UPDATE
		  failed_count = failed_count + 1,
		  last_failed_at = NOW(),
		  locked_until = IF(failed_count + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? SECOND), locked_until)`,
		idDoctor, threshold, lockSeconds)
	if err != nil {
		return false, err
	}
	// Re-read to decide if locked
	row, err := GetLockout(db, idDoctor)
	if err != nil {
		return false, err
	}
	if row.LockedUntil != nil && row.LockedUntil.After(time.Now()) {
		return true, nil
	}
	return false, nil
}

func ResetLockout(db *sql.DB, idDoctor string) error {
	_, err := db.Exec(`DELETE FROM login_lockout WHERE id_doctor = UUID_TO_BIN(?, TRUE)`, idDoctor)
	return err
}
```

**Nota:** el test de `RegisterFail` simplificado sólo verifica el INSERT — el subsiguiente `GetLockout` no se mockeó porque el primer fail nunca lockea. En producción ambas queries corren; ajustar el test si se quiere cobertura completa:

```go
mock.ExpectExec(`INSERT INTO login_lockout`).WithArgs("doc").WillReturnResult(sqlmock.NewResult(1, 1))
mock.ExpectQuery(`SELECT .*FROM login_lockout`).WithArgs("doc").
    WillReturnRows(sqlmock.NewRows([]string{"failed_count", "locked_until", "last_failed_at"}).
        AddRow(1, nil, time.Now()))
```

Actualizar `TestRegisterFail_FirstFailInsertsCountOne` con este segundo mock antes de implementar.

- [ ] **Step 4: Correr test (debe pasar)**

Run: `cd Backend && go test ./auth/... -v -run Lockout`
Expected: PASS 3.

- [ ] **Step 5: Commit**

```bash
git add Backend/auth/lockout_repo.go Backend/auth/lockout_repo_test.go
git commit -m "feat(auth): lockout repository with atomic increment + threshold"
```

---

## Task 7: Audit repository (TDD)

**Files:**
- Create: `Backend/auth/audit_repo.go`
- Create: `Backend/auth/audit_repo_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package auth

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"Qmed-Recipe/models"
)

func TestInsertAudit_WithDoctorID(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`INSERT INTO auth_audit`).
		WithArgs("doc-uuid", "x@y.com", "LOGIN_OK", "1.2.3.4", "ua").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := InsertAudit(db, &models.AuditEvent{
		IDDoctor:   strPtr("doc-uuid"),
		EmailTried: "x@y.com",
		EventType:  models.AuditLoginOK,
		IP:         "1.2.3.4",
		UserAgent:  "ua",
	})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
}

func TestInsertAudit_WithoutDoctorID(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`INSERT INTO auth_audit`).
		WithArgs(nil, "ghost@x.com", "LOGIN_FAIL", "1.2.3.4", "ua").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := InsertAudit(db, &models.AuditEvent{
		EmailTried: "ghost@x.com",
		EventType:  models.AuditLoginFail,
		IP:         "1.2.3.4",
		UserAgent:  "ua",
	})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
}

func strPtr(s string) *string { return &s }
```

- [ ] **Step 2: Añadir `AuditEvent` a models**

Editar `Backend/models/auth_models.go` añadir al final:

```go
type AuditEvent struct {
	IDDoctor   *string
	EmailTried string
	EventType  AuditEventType
	IP         string
	UserAgent  string
}
```

- [ ] **Step 3: Correr test (debe fallar)**

Run: `cd Backend && go test ./auth/... -run Audit`
Expected: FAIL "undefined: InsertAudit".

- [ ] **Step 4: Implementar `Backend/auth/audit_repo.go`**

```go
package auth

import (
	"database/sql"

	"Qmed-Recipe/models"
)

func InsertAudit(db *sql.DB, ev *models.AuditEvent) error {
	var idArg interface{}
	if ev.IDDoctor != nil {
		idArg = *ev.IDDoctor
	} else {
		idArg = nil
	}
	var ua interface{}
	if ev.UserAgent != "" {
		ua = ev.UserAgent
	} else {
		ua = nil
	}
	_, err := db.Exec(`
		INSERT INTO auth_audit (id_doctor, email_tried, event_type, ip, user_agent)
		VALUES (`+nullableUUIDArg(ev.IDDoctor)+`, ?, ?, ?, ?)`,
		idArg, ev.EmailTried, string(ev.EventType), ev.IP, ua)
	return err
}

func nullableUUIDArg(id *string) string {
	if id == nil {
		return "?"
	}
	return "UUID_TO_BIN(?, TRUE)"
}
```

Actualizar test args para reflejar la forma real: cuando hay doctor, el primer arg es la string del uuid (no nil). Cuando no hay, es `nil` y el SQL usa `?` plano. El test ya cubre ambos casos.

- [ ] **Step 5: Correr test**

Run: `cd Backend && go test ./auth/... -v -run Audit`
Expected: PASS 2.

- [ ] **Step 6: Commit**

```bash
git add Backend/auth/audit_repo.go Backend/auth/audit_repo_test.go Backend/models/auth_models.go
git commit -m "feat(auth): audit log repository with nullable doctor id"
```

---

## Task 8: Updated JWT middleware (id_doctor in context + row_status check)

**Files:**
- Modify: `Backend/middleware/jwt.go`
- Create: `Backend/middleware/jwt_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func makeToken(t *testing.T, sub, email string) string {
	t.Helper()
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	claims := jwt.MapClaims{"sub": sub, "email": email,
		"exp": jwt.NewNumericDate(jwt.NewNumericDate(0).Time)}
	// use a future exp by going through GenerateAccessJWT-like path
	return ""
}

func TestValidateJWT_MissingCookie_Returns401(t *testing.T) {
	handler := ValidateJWT(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestValidateJWT_ExpiredToken_SetsWWWAuthHeader(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))

	// Token already expired
	claims := jwt.MapClaims{
		"sub": "doc", "email": "e@x.com",
		"exp": jwt.NewNumericDate(jwt.NewNumericDate(0).Time),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := tok.SignedString(jwtSecret)

	handler := ValidateJWT(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: signed})
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	auth := rec.Header().Get("WWW-Authenticate")
	if auth == "" || !contains(auth, "token_expired") {
		t.Errorf("expected WWW-Authenticate with token_expired, got %q", auth)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
```

**Nota:** el test de `row_status` requiere DB; lo cubrimos en integration tests del handler (Task 10).

- [ ] **Step 2: Correr test (debe fallar inicialmente porque jwt.go aún lee `auth_token` viejo y no expone header)**

Run: `cd Backend && go test ./middleware/...`
Expected: FAIL en `TestValidateJWT_ExpiredToken_SetsWWWAuthHeader`.

- [ ] **Step 3: Reemplazar `Backend/middleware/jwt.go`**

```go
package middleware

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"os"
	"time"

	"Qmed-Recipe/db"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

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
			http.Error(w, `{"error":"missing_token"}`, http.StatusUnauthorized)
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
			}
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}
		if !token.Valid {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}
		idDoctor, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)
		if idDoctor == "" {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}

		// Re-validate row_status (ACTIVE = id 2). Doctor flipped to INACTIVE
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
			http.Error(w, `{"error":"account_not_found"}`, http.StatusUnauthorized)
			return
		}
		if err != nil {
			http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
			return
		}
		if status != 2 {
			http.Error(w, `{"error":"account_disabled"}`, http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), DoctorIDKey, idDoctor)
		ctx = context.WithValue(ctx, DoctorEmailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GenerateJWT kept for backwards compat during rollout; delegates to auth.GenerateAccessJWT.
// Will be removed after the alias endpoints are gone.
func GenerateJWT(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"exp":   jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(jwtSecret)
}
```

**Importante:** la firma cambió de `func(next http.HandlerFunc) http.HandlerFunc` a `func(next http.Handler) http.Handler` para componer mejor con CSRF middleware. Esto romperá la firma en `routes.go` (se arregla en Task 13).

- [ ] **Step 4: Correr test del middleware**

Run: `cd Backend && go test ./middleware/... -v`
Expected: PASS los 2 tests del jwt.

Si la compilación falla por `routes.go` u otros llamadores: temporal — el test del middleware se ejecuta dentro del paquete, pero `go build ./...` fallará hasta Task 13. Para evitar bloqueo, hacer build sólo del paquete: `go test ./middleware/...`.

- [ ] **Step 5: Commit**

```bash
git add Backend/middleware/jwt.go Backend/middleware/jwt_test.go
git commit -m "feat(auth): jwt middleware reads access_token, puts id_doctor in ctx, checks row_status"
```

---

## Task 9: Login handler (TDD)

**Files:**
- Create: `Backend/handlers/auth_login.go`
- Create: `Backend/handlers/auth_login_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// Smoke test: invalid JSON returns 400.
func TestAuthLogin_BadJSON_Returns400(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBufferString("{bad"))
	AuthLogin(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestAuthLogin_MissingEmail_Returns401Generic(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32-bytes-padding-xxxx")
	body, _ := json.Marshal(map[string]string{"email": "", "password": "x"})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
	AuthLogin(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "invalid_credentials") {
		t.Errorf("expected invalid_credentials, got: %s", rec.Body.String())
	}
}
```

**Nota:** tests más profundos (5 fallos → lockout, INACTIVE → 403, éxito → 3 cookies) requieren DB real o un wrapping fino. Para mantener la suite ejecutable sin DB local, marcamos los happy-path como integration tests bajo `// +build integration` (cubiertos en Task 14). Aquí cubrimos sólo el path sin DB.

- [ ] **Step 2: Correr test (debe fallar)**

Run: `cd Backend && go test ./handlers/... -run AuthLogin`
Expected: FAIL "undefined: AuthLogin".

- [ ] **Step 3: Implementar `Backend/handlers/auth_login.go`**

```go
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"Qmed-Recipe/auth"
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const dummyHash = "$2a$12$dummyhashfortimingnoop000000000000000000000000000000000"

func clientIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	return ip
}

func writeAuthError(w http.ResponseWriter, status int, code string, retryAfter int) {
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
	database := db.DB
	if database == nil {
		database = db.InitDB()
	}

	// Empty email shortcut. Still run bcrypt to keep timing consistent.
	if creds.Email == "" {
		bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(creds.Password))
		_ = auth.InsertAudit(database, &models.AuditEvent{
			EmailTried: "", EventType: models.AuditLoginFail, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusUnauthorized, "invalid_credentials", 0)
		return
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
		_ = auth.InsertAudit(database, &models.AuditEvent{
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
	lockout, err := auth.GetLockout(database, idDoctor)
	if err != nil {
		log.Printf("lockout fetch error: %v", err)
	}
	if lockout != nil && lockout.LockedUntil != nil && lockout.LockedUntil.After(time.Now()) {
		retry := int(time.Until(*lockout.LockedUntil).Seconds())
		_ = auth.InsertAudit(database, &models.AuditEvent{
			IDDoctor: &idDoctor, EmailTried: creds.Email,
			EventType: models.AuditLoginFail, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusLocked, "account_locked", retry)
		return
	}

	// row_status check (2 = ACTIVE)
	if statusID != 2 {
		_ = auth.InsertAudit(database, &models.AuditEvent{
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
		_ = auth.InsertAudit(database, &models.AuditEvent{
			IDDoctor: &idDoctor, EmailTried: creds.Email,
			EventType: evType, IP: ip, UserAgent: ua,
		})
		writeAuthError(w, http.StatusUnauthorized, "invalid_credentials", 0)
		return
	}

	// Success — reset lockout, mint tokens
	_ = auth.ResetLockout(database, idDoctor)

	accessTok, err := auth.GenerateAccessJWT(idDoctor, creds.Email)
	if err != nil {
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}
	refreshRaw, err := auth.GenerateRandomToken(32)
	if err != nil {
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}
	csrfRaw, err := auth.GenerateRandomToken(32)
	if err != nil {
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

	_ = auth.InsertAudit(database, &models.AuditEvent{
		IDDoctor: &idDoctor, EmailTried: creds.Email,
		EventType: models.AuditLoginOK, IP: ip, UserAgent: ua,
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
```

- [ ] **Step 4: Eliminar `LoginResponse` de models (si seguía)**

Editar `Backend/models/login_model.go` para que sólo tenga `LoginRequest`.

- [ ] **Step 5: Hacer que `LoginDoctor` (handler viejo) delegue**

Reemplazar `Backend/handlers/login.go` con:

```go
package handlers

import "net/http"

// LoginDoctor is a transitional alias for AuthLogin. Remove after frontend
// migration to /api/auth/login is complete.
func LoginDoctor(w http.ResponseWriter, r *http.Request) {
	AuthLogin(w, r)
}
```

- [ ] **Step 6: Correr tests**

Run: `cd Backend && go test ./handlers/... -run AuthLogin -v`
Expected: PASS 2.

Run: `cd Backend && go build ./...`
Expected: build OK (puede fallar por jwt middleware firma — se arregla en Task 13). Si falla, hacer `go test` sólo del paquete que estás tocando: `go test ./handlers/...`.

- [ ] **Step 7: Commit**

```bash
git add Backend/handlers/auth_login.go Backend/handlers/auth_login_test.go Backend/handlers/login.go Backend/models/login_model.go
git commit -m "feat(auth): /api/auth/login with lockout, audit, 3 cookies"
```

---

## Task 10: Refresh handler (TDD)

**Files:**
- Create: `Backend/handlers/auth_refresh.go`
- Create: `Backend/handlers/auth_refresh_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthRefresh_MissingCookie_Returns401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	AuthRefresh(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
```

(Tests profundos — reuso, gracia 2s — son integration y van bajo build tag en Task 14.)

- [ ] **Step 2: Correr test (debe fallar)**

Run: `cd Backend && go test ./handlers/... -run AuthRefresh`
Expected: FAIL "undefined: AuthRefresh".

- [ ] **Step 3: Implementar `Backend/handlers/auth_refresh.go`**

```go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"Qmed-Recipe/auth"
	"Qmed-Recipe/db"
	"Qmed-Recipe/models"

	"database/sql"
)

func refreshGrace() time.Duration {
	if v := os.Getenv("REFRESH_GRACE_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			return time.Duration(n) * time.Second
		}
	}
	return 2 * time.Second
}

func AuthRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}

	ip := clientIP(r)
	ua := r.Header.Get("User-Agent")
	database := db.DB
	if database == nil {
		database = db.InitDB()
	}

	hash := auth.HashToken(cookie.Value)
	row, err := auth.FindRefreshByHash(database, hash)
	if err == sql.ErrNoRows {
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}
	if err != nil {
		log.Printf("refresh lookup error: %v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	if row.RevokedAt != nil || row.ExpiresAt.Before(time.Now()) {
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}

	// Reuse detection: if used_at is set, the only acceptable case is a
	// race within REFRESH_GRACE_SECONDS. Otherwise → likely token theft,
	// revoke the entire family and refuse.
	if row.UsedAt != nil {
		if time.Since(*row.UsedAt) > refreshGrace() {
			_ = auth.RevokeFamily(database, row.IDFamily)
			_ = auth.InsertAudit(database, &models.AuditEvent{
				IDDoctor: &row.IDDoctor, EmailTried: "",
				EventType: models.AuditRefreshReuse, IP: ip, UserAgent: ua,
			})
		}
		writeAuthError(w, http.StatusUnauthorized, "session_expired", 0)
		return
	}

	// Fetch email for the JWT claims
	var email string
	if err := database.QueryRow(
		`SELECT email FROM doctor WHERE id_doctor = UUID_TO_BIN(?, TRUE)`,
		row.IDDoctor,
	).Scan(&email); err != nil {
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	if err := auth.MarkRefreshUsed(database, row.IDToken); err != nil {
		log.Printf("mark used error: %v", err)
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	// Issue new tokens within same family
	newRefresh, _ := auth.GenerateRandomToken(32)
	newAccess, _ := auth.GenerateAccessJWT(row.IDDoctor, email)
	newCSRF, _ := auth.GenerateRandomToken(32)

	if err := auth.InsertRefresh(database, row.IDDoctor, row.IDFamily,
		auth.HashToken(newRefresh),
		time.Now().Add(auth.RefreshTTL()), ua, ip); err != nil {
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}

	auth.SetAuthCookies(w, newAccess, newRefresh, newCSRF)
	_ = auth.InsertAudit(database, &models.AuditEvent{
		IDDoctor: &row.IDDoctor, EmailTried: email,
		EventType: models.AuditRefreshOK, IP: ip, UserAgent: ua,
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
```

- [ ] **Step 4: Correr test**

Run: `cd Backend && go test ./handlers/... -run AuthRefresh -v`
Expected: PASS 1.

- [ ] **Step 5: Commit**

```bash
git add Backend/handlers/auth_refresh.go Backend/handlers/auth_refresh_test.go
git commit -m "feat(auth): /api/auth/refresh with rotation + reuse detection"
```

---

## Task 11: Logout & Me handlers

**Files:**
- Create: `Backend/handlers/auth_logout.go`
- Create: `Backend/handlers/auth_logout_test.go`
- Create: `Backend/handlers/auth_me.go`
- Create: `Backend/handlers/auth_me_test.go`
- Modify: `Backend/handlers/logout.go` (convertir en alias)

- [ ] **Step 1: Tests fallidos para logout y me**

`Backend/handlers/auth_logout_test.go`:

```go
package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAuthLogout_NoCookies_ClearsAndReturns200(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/auth/logout", nil)
	AuthLogout(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	headers := rec.Header().Values("Set-Cookie")
	if len(headers) < 3 {
		t.Errorf("expected 3 Set-Cookie headers (clearing all), got %d", len(headers))
	}
	for _, h := range headers {
		if !strings.Contains(h, "Max-Age=0") {
			t.Errorf("expected Max-Age=0 in cookie: %s", h)
		}
	}
}
```

`Backend/handlers/auth_me_test.go`:

```go
package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"Qmed-Recipe/middleware"
)

func TestAuthMe_NoContextDoctorID_Returns401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/auth/me", nil)
	AuthMe(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestAuthMe_WithContextDoctorID_AttemptsLookup(t *testing.T) {
	// With a context id but no DB connection wired in test, we expect 500.
	ctx := context.WithValue(context.Background(), middleware.DoctorIDKey, "fake-uuid")
	req := httptest.NewRequest("GET", "/api/auth/me", nil).WithContext(ctx)
	rec := httptest.NewRecorder()
	AuthMe(rec, req)
	if rec.Code == http.StatusUnauthorized {
		t.Errorf("did not look up doctor — id was in ctx, expected !=401, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Implementar `Backend/handlers/auth_logout.go`**

```go
package handlers

import (
	"encoding/json"
	"net/http"

	"Qmed-Recipe/auth"
	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
)

func AuthLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Best-effort server-side revoke; cookies are always cleared.
	if cookie, err := r.Cookie("refresh_token"); err == nil {
		database := db.DB
		if database == nil {
			database = db.InitDB()
		}
		hash := auth.HashToken(cookie.Value)
		if row, err := auth.FindRefreshByHash(database, hash); err == nil {
			_ = auth.RevokeToken(database, row.IDToken)
			_ = auth.InsertAudit(database, &models.AuditEvent{
				IDDoctor:  &row.IDDoctor,
				EmailTried: "",
				EventType: models.AuditLogout,
				IP:        clientIP(r),
				UserAgent: r.Header.Get("User-Agent"),
			})
		}
	}
	_ = middleware.DoctorIDKey // keep import
	auth.ClearAuthCookies(w)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
```

(Quitar el `_ = middleware.DoctorIDKey` si no se usa el import en otro lado; está sólo para evitar lint si se importa.)

- [ ] **Step 3: Implementar `Backend/handlers/auth_me.go`**

```go
package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/models"
)

func AuthMe(w http.ResponseWriter, r *http.Request) {
	idDoctor, _ := r.Context().Value(middleware.DoctorIDKey).(string)
	if idDoctor == "" {
		writeAuthError(w, http.StatusUnauthorized, "missing_token", 0)
		return
	}

	database := db.DB
	if database == nil {
		database = db.InitDB()
	}

	var resp models.MeResponse
	var specialty sql.NullString
	err := database.QueryRow(`
		SELECT BIN_TO_UUID(id_doctor, TRUE), email, name, specialty
		FROM doctor WHERE id_doctor = UUID_TO_BIN(?, TRUE)`,
		idDoctor,
	).Scan(&resp.IDDoctor, &resp.Email, &resp.Name, &specialty)
	if err == sql.ErrNoRows {
		writeAuthError(w, http.StatusUnauthorized, "account_not_found", 0)
		return
	}
	if err != nil {
		writeAuthError(w, http.StatusInternalServerError, "server_error", 0)
		return
	}
	if specialty.Valid {
		resp.Specialty = specialty.String
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
```

- [ ] **Step 4: Convertir `Backend/handlers/logout.go` en alias**

```go
package handlers

import "net/http"

// LogoutDoctor is a transitional alias for AuthLogout. Remove after frontend
// migration is complete.
func LogoutDoctor(w http.ResponseWriter, r *http.Request) {
	AuthLogout(w, r)
}
```

- [ ] **Step 5: Correr tests**

Run: `cd Backend && go test ./handlers/... -run "AuthLogout|AuthMe" -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Backend/handlers/auth_logout.go Backend/handlers/auth_logout_test.go Backend/handlers/auth_me.go Backend/handlers/auth_me_test.go Backend/handlers/logout.go
git commit -m "feat(auth): /api/auth/logout (revokes refresh) and /api/auth/me"
```

---

## Task 12: CSRF middleware (TDD)

**Files:**
- Create: `Backend/middleware/csrf.go`
- Create: `Backend/middleware/csrf_test.go`

- [ ] **Step 1: Escribir test fallido**

```go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCSRF_SafeMethodPassesThrough(t *testing.T) {
	called := false
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true }))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	h.ServeHTTP(rec, req)
	if !called {
		t.Error("GET should not be blocked by CSRF")
	}
}

func TestCSRF_PostMissingHeader_Returns403(t *testing.T) {
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "csrf_invalid") {
		t.Errorf("expected csrf_invalid body, got: %s", rec.Body.String())
	}
}

func TestCSRF_PostMismatch_Returns403(t *testing.T) {
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	req.Header.Set("X-CSRF-Token", "xyz")
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}

func TestCSRF_PostMatch_PassesThrough(t *testing.T) {
	called := false
	h := CSRF(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true }))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/x", nil)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc123"})
	req.Header.Set("X-CSRF-Token", "abc123")
	h.ServeHTTP(rec, req)
	if !called {
		t.Error("matching CSRF should pass through")
	}
}
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `cd Backend && go test ./middleware/... -run CSRF`
Expected: FAIL "undefined: CSRF".

- [ ] **Step 3: Implementar `Backend/middleware/csrf.go`**

```go
package middleware

import (
	"crypto/subtle"
	"net/http"
)

// CSRF enforces double-submit cookie pattern: the cookie csrf_token must match
// the X-CSRF-Token header. Safe methods (GET/HEAD/OPTIONS) bypass the check.
func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}

		cookie, err := r.Cookie("csrf_token")
		header := r.Header.Get("X-CSRF-Token")
		if err != nil || header == "" {
			http.Error(w, `{"error":"csrf_invalid"}`, http.StatusForbidden)
			return
		}
		if subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(header)) != 1 {
			http.Error(w, `{"error":"csrf_invalid"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Correr test**

Run: `cd Backend && go test ./middleware/... -run CSRF -v`
Expected: PASS 4.

- [ ] **Step 5: Commit**

```bash
git add Backend/middleware/csrf.go Backend/middleware/csrf_test.go
git commit -m "feat(auth): CSRF middleware (double-submit cookie)"
```

---

## Task 13: Wire routes (new endpoints + middleware composition)

**Files:**
- Modify: `Backend/routes/routes.go`
- Modify: `Backend/middleware/cors.go` (añadir `X-CSRF-Token` a allowed headers)

- [ ] **Step 1: Actualizar CORS para permitir el header CSRF**

Editar `Backend/middleware/cors.go` línea 18:

```go
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token")
```

- [ ] **Step 2: Reemplazar `Backend/routes/routes.go`**

```go
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
	// IP rate limit for login (existing): 2/hr then 1h IP block.
	lmt := tollbooth.NewLimiter(2, &limiter.ExpirableOptions{DefaultExpirationTTL: time.Hour})
	lmt.SetMessage(`{"error":"too_many_attempts"}`)
	lmt.SetMessageContentType("application/json")
	lmt.SetOnLimitReached(func(w http.ResponseWriter, r *http.Request) {
		blockIP(getIP(r))
	})

	loginRateLimited := BlockedIPMiddleware(
		tollbooth.LimitHandler(lmt, http.HandlerFunc(handlers.AuthLogin)),
	)

	// New auth endpoints (canonical)
	r.Handle("/api/auth/login", loginRateLimited).Methods("POST", "OPTIONS")
	r.Handle("/api/auth/refresh", http.HandlerFunc(handlers.AuthRefresh)).Methods("POST", "OPTIONS")
	r.Handle("/api/auth/logout", http.HandlerFunc(handlers.AuthLogout)).Methods("POST", "OPTIONS")
	r.Handle("/api/auth/me", middleware.ValidateJWT(http.HandlerFunc(handlers.AuthMe))).Methods("GET", "OPTIONS")

	// Transitional aliases (remove after frontend migrates)
	r.Handle("/api/login", loginRateLimited).Methods("POST", "OPTIONS")
	r.Handle("/api/logout", http.HandlerFunc(handlers.LogoutDoctor)).Methods("POST", "OPTIONS")

	// Protected mutating routes: JWT + CSRF
	// Protected GET routes: JWT only.
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
	}

	for _, rt := range mutating {
		r.Handle(rt.Path, middleware.ValidateJWT(middleware.CSRF(rt.Handler))).Methods(rt.Methods...)
	}
	for _, rt := range readOnly {
		r.Handle(rt.Path, middleware.ValidateJWT(rt.Handler)).Methods(rt.Methods...)
	}
}
```

- [ ] **Step 3: Verificar build completo**

Run: `cd Backend && go build ./...`
Expected: build OK.

Run: `cd Backend && go test ./...`
Expected: PASS todos (los handler tests no-DB y los unit tests con sqlmock).

- [ ] **Step 4: Commit**

```bash
git add Backend/routes/routes.go Backend/middleware/cors.go
git commit -m "feat(auth): wire /api/auth/* routes; CSRF on mutating; alias legacy"
```

---

## Task 14: Backend smoke integration test (manual)

**Files:**
- (manual — no commit de código aquí)

- [ ] **Step 1: Levantar el backend**

Run: `cd Backend && go run main.go`
Expected: "Servidor corriendo en el puerto 5174".

- [ ] **Step 2: Probar login OK**

En otra terminal:
```bash
curl -i -X POST http://localhost:5174/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<doctor_real>","password":"<password>"}'
```
Expected: `200 OK`, tres headers `Set-Cookie` (`access_token`, `refresh_token`, `csrf_token`), body `{"ok":true}`.

- [ ] **Step 3: Probar /me**

```bash
curl -i http://localhost:5174/api/auth/me \
  --cookie "access_token=<valor del Set-Cookie>"
```
Expected: `200 OK`, JSON con `id_doctor`, `email`, `name`.

- [ ] **Step 4: Probar lockout**

Ejecutar 5 logins con password mal:
```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5174/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"<doctor_real>","password":"wrong"}'
done
```
Expected: primeros 4 → `401`, el 5to (que cruza umbral) → `401` (porque la lógica registra el fallo y devuelve invalid_credentials). El 6to intento → `423`.

Verificar en DB:
```sql
SELECT failed_count, locked_until FROM login_lockout
  WHERE id_doctor = UUID_TO_BIN('<uuid_doctor>', TRUE);
```
Expected: `failed_count=5`, `locked_until` ~15min en el futuro.

- [ ] **Step 5: Limpiar lockout para seguir desarrollo**

```sql
DELETE FROM login_lockout WHERE id_doctor = UUID_TO_BIN('<uuid_doctor>', TRUE);
```

- [ ] **Step 6: Probar CSRF**

```bash
# Login y guardar cookies
curl -c /tmp/c.txt -X POST http://localhost:5174/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<pw>"}'

# POST sin header CSRF → 403
curl -i -b /tmp/c.txt -X POST http://localhost:5174/api/paciente \
  -H "Content-Type: application/json" -d '{}'
```
Expected: `403`, body `{"error":"csrf_invalid"}`.

```bash
# Con header correcto desde el cookie
CSRF=$(grep csrf_token /tmp/c.txt | awk '{print $7}')
curl -i -b /tmp/c.txt -X POST http://localhost:5174/api/paciente \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" -d '{}'
```
Expected: pasa el middleware CSRF (puede fallar luego en el handler por body inválido, pero ya no es 403 de CSRF).

Si todo pasa, marcar el step como hecho. No hay commit en este task — sólo verificación manual.

---

## Task 15: Frontend test infra (vitest + msw)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/test/setup.js`
- Create: `src/test/handlers.js`

- [ ] **Step 1: Instalar devDeps**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom msw@^2 @vitest/coverage-v8
```
Expected: añadidos a `devDependencies`.

- [ ] **Step 2: Añadir script de test a `package.json`**

En la sección `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Crear `vitest.config.js`** (en raíz del proyecto)

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
```

- [ ] **Step 4: Crear `src/test/setup.js`**

```js
import '@testing-library/jest-dom';
import { server } from './handlers';
import { beforeAll, afterEach, afterAll } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 5: Crear `src/test/handlers.js`** (MSW handlers default)

```js
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const API = 'http://localhost:5174';

export const handlers = [
  http.get(`${API}/api/auth/me`, () =>
    HttpResponse.json({
      id_doctor: 'doc-1', email: 'doc@x.com', name: 'Doc Test', specialty: '',
    })
  ),
  http.post(`${API}/api/auth/login`, async () =>
    HttpResponse.json({ ok: true })
  ),
  http.post(`${API}/api/auth/refresh`, () =>
    HttpResponse.json({ ok: true })
  ),
  http.post(`${API}/api/auth/logout`, () =>
    HttpResponse.json({ ok: true })
  ),
];

export const server = setupServer(...handlers);
```

- [ ] **Step 6: Verificar que vitest corre**

Run: `npm test`
Expected: "No test files found" (aún no escribimos). Exit code 0 o 1 dependiendo de versión; lo importante es que vitest arranque sin error.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/test/
git commit -m "test: add vitest + msw infra for frontend tests"
```

---

## Task 16: Frontend — csrf util, axios instance, auth utils (TDD)

**Files:**
- Create: `src/utils/csrf.js`
- Modify: `src/utils/api.jsx` (rewrite to export axios instance)
- Modify: `src/utils/auth.jsx` (rewrite)
- Create: `src/utils/api.test.js`

- [ ] **Step 1: Escribir test fallido para api/csrf**

`src/utils/api.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { getCsrfToken } from './csrf';

describe('getCsrfToken', () => {
  beforeEach(() => {
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('returns empty string when cookie absent', () => {
    expect(getCsrfToken()).toBe('');
  });

  it('reads csrf_token cookie value', () => {
    document.cookie = 'csrf_token=abc123; path=/';
    expect(getCsrfToken()).toBe('abc123');
  });
});
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `npm test -- src/utils/api.test.js`
Expected: FAIL "Cannot find module './csrf'".

- [ ] **Step 3: Crear `src/utils/csrf.js`**

```js
export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
```

- [ ] **Step 4: Rewrite `src/utils/api.jsx`**

```jsx
import axios from 'axios';
import { getCsrfToken } from './csrf';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Inject CSRF header on mutating requests.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCsrfToken();
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

let refreshInFlight = null;
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    const wwwAuth = response.headers['www-authenticate'] || '';
    const isExpired = response.status === 401 && wwwAuth.includes('token_expired');

    if (isExpired && !config.__retried) {
      config.__retried = true;
      try {
        refreshInFlight = refreshInFlight || api.post('/api/auth/refresh');
        await refreshInFlight;
        refreshInFlight = null;
        return api(config);
      } catch (e) {
        refreshInFlight = null;
        onUnauthorized();
        return Promise.reject(e);
      }
    }

    if (response.status === 401 || response.status === 403 || response.status === 423) {
      // Don't redirect on /me itself — caller (AuthContext) will handle.
      if (!config.url?.endsWith('/api/auth/me') && !config.url?.endsWith('/api/auth/login')) {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 5: Rewrite `src/utils/auth.jsx`**

```jsx
import { api } from './api';

export async function loginRequest(email, password) {
  return api.post('/api/auth/login', { email, password });
}

export async function logoutRequest() {
  return api.post('/api/auth/logout');
}

export async function fetchMe() {
  const resp = await api.get('/api/auth/me');
  return resp.data;
}
```

- [ ] **Step 6: Correr tests**

Run: `npm test`
Expected: 2 PASS (los de getCsrfToken).

- [ ] **Step 7: Commit**

```bash
git add src/utils/csrf.js src/utils/api.jsx src/utils/auth.jsx src/utils/api.test.js
git commit -m "feat(auth-fe): axios instance with CSRF + refresh interceptors"
```

---

## Task 17: AuthContext + hook (TDD)

**Files:**
- Create: `src/context/AuthContext.jsx`
- Create: `src/context/AuthContext.test.jsx`

- [ ] **Step 1: Escribir test fallido**

`src/context/AuthContext.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{user ? `hi ${user.email}` : 'anon'}</p>;
}

describe('AuthContext', () => {
  it('fetches /me on mount and exposes user', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText(/hi doc@x.com/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `npm test -- AuthContext`
Expected: FAIL "Cannot find module './AuthContext'".

- [ ] **Step 3: Implementar `src/context/AuthContext.jsx`**

```jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginRequest, logoutRequest, fetchMe } from '../utils/auth';
import { setUnauthorizedHandler } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    await loginRequest(email, password);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await logoutRequest(); } catch { /* best-effort */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 4: Correr test**

Run: `npm test -- AuthContext`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/AuthContext.jsx src/context/AuthContext.test.jsx
git commit -m "feat(auth-fe): AuthContext with /me as source of truth"
```

---

## Task 18: ProtectedRoute (TDD)

**Files:**
- Create: `src/components/ProtectedRoute.jsx`
- Create: `src/components/ProtectedRoute.test.jsx`

- [ ] **Step 1: Escribir test fallido**

`src/components/ProtectedRoute.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/handlers';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function App({ initial }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>secret</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when /me returns 401', async () => {
    server.use(
      http.get('http://localhost:5174/api/auth/me', () =>
        new HttpResponse(null, { status: 401 })
      ),
      http.post('http://localhost:5174/api/auth/refresh', () =>
        new HttpResponse(null, { status: 401 })
      )
    );
    render(<App initial="/" />);
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders children when authenticated', async () => {
    render(<App initial="/" />);
    await waitFor(() => expect(screen.getByText('secret')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Correr test (debe fallar)**

Run: `npm test -- ProtectedRoute`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ProtectedRoute.jsx`**

```jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading">
        <p>Cargando…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Correr test**

Run: `npm test -- ProtectedRoute`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProtectedRoute.jsx src/components/ProtectedRoute.test.jsx
git commit -m "feat(auth-fe): ProtectedRoute uses AuthContext"
```

---

## Task 19: Update Login.jsx (differentiated errors + AuthContext)

**Files:**
- Modify: `src/Pages/Login.jsx`

- [ ] **Step 1: Reemplazar contenido**

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';
import logo from '../imgs/Logo.jpg';

const ERR_MAP = {
  invalid_credentials: 'Correo o contraseña incorrectos',
  account_locked: 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.',
  too_many_attempts: 'Demasiados intentos desde esta red. Intenta en 1 hora.',
  account_disabled: 'Cuenta inactiva. Contacta al administrador.',
};

function messageFor(status, code) {
  if (status === 423) return ERR_MAP.account_locked;
  if (status === 429) return ERR_MAP.too_many_attempts;
  if (status === 403) return ERR_MAP.account_disabled;
  if (status === 401) return ERR_MAP.invalid_credentials;
  if (code && ERR_MAP[code]) return ERR_MAP[code];
  return 'Error en el servidor';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/');
  }, [user, loading, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error;
      setError(messageFor(status, code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <img src={logo} alt="Logo" className="login-logo" />
        <h2 className="login-title">Iniciar Sesión</h2>
        {error && <p className="login-error">{error}</p>}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-button" disabled={submitting}>
          {submitting ? 'Verificando…' : 'Iniciar sesión'}
        </button>
        <a className="forgot-password" href="#">Olvidé mi contraseña</a>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Pages/Login.jsx
git commit -m "feat(auth-fe): Login uses AuthContext, differentiated errors by status"
```

---

## Task 20: Update SidebarMenu logout

**Files:**
- Modify: `src/components/SidebarMenu.jsx`

- [ ] **Step 1: Cambiar import y handler de logout**

Reemplazar línea 21:
```jsx
import { logout } from "../utils/auth";
```
con:
```jsx
import { useAuth } from "../context/AuthContext";
```

Dentro del componente, después de `const isActive = ...` (línea 27), añadir:
```jsx
const { logout } = useAuth();
```

El uso en línea 174 `logout();` ya queda correcto sin más cambios — ahora llama al método del context.

- [ ] **Step 2: Commit**

```bash
git add src/components/SidebarMenu.jsx
git commit -m "refactor(auth-fe): Sidebar logout uses AuthContext"
```

---

## Task 21: Wrap App with AuthProvider + ProtectedRoute

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Reescribir `App.jsx`**

```jsx
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import SidebarMenu from "./components/SidebarMenu";
import ListaPacientes from "./components/ListPacients";
import Pacientes from "./components/Pacientes";
import RecetaForm from "./components/RecetaForm";
import Login from "./Pages/Login";
import Laboratorios from "./components/Laboratory";
import ListComponents from "./components/List-Components";
import ComponentModal from "./components/component";
import Medicamentos from "./components/Medicamentos";
import ListLaboratories from "./components/List-Laboratories";
import ListMedicines from "./components/List-medications";
import ListRecipes from "./components/List-Recipes";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/App.css";

function ModalRoutes({ paciente, setPaciente }) {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/addpacient" element={
        <Pacientes paciente={paciente} setPaciente={setPaciente}
          moduleAnimation={true}
          onPacienteGuardado={() => navigate(-1)}
          onClose={() => navigate(-1)} />
      } />
      <Route path="/editpacient" element={
        <Pacientes paciente={paciente} setPaciente={setPaciente}
          moduleAnimation={true}
          onPacienteGuardado={() => navigate(-1)}
          onClose={() => navigate(-1)} />
      } />
      <Route path="/laboratorios/add" element={
        <Laboratorios showModule={true}
          setShowModule={() => navigate(-1)}
          onLaboratorioGuardado={() => navigate(-1)}
          moduleAnimation={true} />
      } />
      <Route path="/componentes/add" element={
        <ComponentModal moduleAnimation={true} onClose={() => navigate(-1)} />
      } />
      <Route path="/medicamentos/add" element={
        <Medicamentos medicamento={{}}
          setShowModule={() => navigate(-1)}
          moduleAnimation={true}
          onMedicamentoGuardado={() => navigate(-1)} />
      } />
      <Route path="/medicamentos/edit" element={
        <Medicamentos medicamento={{}}
          setShowModule={() => navigate(-1)}
          moduleAnimation={true}
          onMedicamentoGuardado={() => navigate(-1)} />
      } />
    </Routes>
  );
}

function ProtectedShell({ paciente, setPaciente }) {
  const location = useLocation();
  const backgroundLocation = location.state?.background;

  return (
    <div className="layout">
      <aside className="sidebar-wrapper">
        <SidebarMenu />
      </aside>
      <main className="main-content">
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<RecetaForm />} />
          <Route path="/list-pacients" element={<ListaPacientes setPaciente={setPaciente} />} />
          <Route path="/list-componentes" element={<ListComponents />} />
          <Route path="/list-recipes" element={<ListRecipes />} />
          <Route path="/list-medicines" element={<ListMedicines />} />
          <Route path="/list-laboratories" element={<ListLaboratories />} />
          <Route path="*" element={<RecetaForm />} />
        </Routes>
        {backgroundLocation && <ModalRoutes paciente={paciente} setPaciente={setPaciente} />}
      </main>
    </div>
  );
}

function AppContent() {
  const [paciente, setPaciente] = useState(null);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<ProtectedShell paciente={paciente} setPaciente={setPaciente} />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
```

- [ ] **Step 2: Probar manualmente**

Run: `npm run dev` (en otra terminal el backend con `go run main.go`)
- Acceder a `/` sin sesión → debe redirigir a `/login`.
- Login con credenciales válidas → entra a `/`.
- Refrescar (`F5`) → sigue logueado (porque `/me` se llama al montar el provider).
- Logout desde sidebar → vuelve a `/login`.
- Dejar idle 16 min → próximo request debe disparar refresh transparentemente.

Si todo se ve bien, marca el step.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(auth-fe): wrap app with AuthProvider + ProtectedRoute"
```

---

## Task 22: Cleanup legacy aliases (después de validación)

**Files:**
- Modify: `Backend/routes/routes.go` (eliminar `/api/login` y `/api/logout` aliases)
- Delete: `Backend/handlers/login.go`, `Backend/handlers/logout.go`
- Modify: `Backend/middleware/jwt.go` (eliminar `GenerateJWT` legacy)

> Ejecutar **sólo después de** verificar que el frontend usa exclusivamente `/api/auth/*` y nadie consume los endpoints viejos. Idealmente esperar 1 sprint.

- [ ] **Step 1: Quitar las dos líneas alias en `routes.go`**

Eliminar:
```go
r.Handle("/api/login", loginRateLimited).Methods("POST", "OPTIONS")
r.Handle("/api/logout", http.HandlerFunc(handlers.LogoutDoctor)).Methods("POST", "OPTIONS")
```

- [ ] **Step 2: Borrar archivos alias**

```bash
rm Backend/handlers/login.go Backend/handlers/logout.go
```

- [ ] **Step 3: Eliminar `GenerateJWT` legacy de `Backend/middleware/jwt.go`**

Borrar la función al final del archivo.

- [ ] **Step 4: Verificar build + tests**

Run:
```bash
cd Backend && go build ./... && go test ./...
cd .. && npm test
```
Expected: todo PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(auth): remove legacy /api/login, /api/logout aliases"
```

---

## Notas finales

- **Variables de entorno requeridas** (añadir a `.env` si no están):
  - `JWT_SECRET` (existente — debe tener ≥32 bytes)
  - `JWT_ACCESS_MINUTES=15` (opcional, default 15)
  - `JWT_REFRESH_DAYS=7` (opcional, default 7)
  - `LOCKOUT_THRESHOLD=5`
  - `LOCKOUT_MINUTES=15`
  - `REFRESH_GRACE_SECONDS=2`
  - `APP_ENV=production` para Secure cookies en deploy

- **Retención (post-MVP):** programar cron mensual:
  ```sql
  DELETE FROM auth_audit WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
  DELETE FROM refresh_token WHERE expires_at < NOW();
  ```

- **Tests de integración profundos** (5 fallos → lockout, reuso de refresh → familia revocada, etc.) quedan documentados en este plan pero se ejecutan **manualmente** en Task 14. Si se quisiera automatizarlos, montar un test DB con docker-compose y un `_integration_test.go` con build tag `integration`.
