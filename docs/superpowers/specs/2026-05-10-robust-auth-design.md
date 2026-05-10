# Sistema de Verificación Robusto — Diseño

**Fecha:** 2026-05-10
**Scope:** Endurecer login + sesión (opción A). Fuera de scope: reset por email, política de complejidad, verificación de email, 2FA.

## 1. Objetivo

Reemplazar el login actual (JWT único de 24h en cookie + flag `sessionStorage`) por un sistema con access/refresh rotantes, lockout por cuenta, protección CSRF, audit log y un endpoint de identidad que sea la única fuente de verdad para el estado de sesión.

## 2. Línea base (sistema actual)

**Backend** ([Backend/handlers/login.go](../../../Backend/handlers/login.go), [routes/routes.go](../../../Backend/routes/routes.go))
- `POST /api/login` con bcrypt + JWT HS256 (24h) en cookie HttpOnly, SameSite=Strict.
- Rate limit por IP via tollbooth (2/hr) + bloqueo de IP 1h cuando se excede.
- `POST /api/logout` borra la cookie (no revoca el JWT — sigue siendo válido hasta expirar).

**Frontend** ([src/utils/auth.jsx](../../../src/utils/auth.jsx), [src/Pages/Login.jsx](../../../src/Pages/Login.jsx))
- `saveToken()` guarda flag `loggedIn` en `sessionStorage`.
- `isAuthenticated()` lee ese flag — no consulta al servidor, es engañable.
- No hay `ProtectedRoute`, ni interceptor axios para 401, ni endpoint `/api/me`.

**Debilidades identificadas**
- Sin CSRF token (sólo SameSite=Strict).
- JWT lleva sólo `email`, no `id_doctor`; sin `jti`, sin posibilidad de revocación.
- No verifica `doctor.row_status` al loguear ni en requests.
- Sin lockout por cuenta (sólo por IP, eludible con NAT/proxy).
- Sin audit log de intentos.
- Logout no invalida la sesión server-side.
- Frontend confía en `sessionStorage` desincronizado del cookie real.
- "Olvidé mi contraseña" es link muerto (fuera de scope, se documenta).

## 3. Arquitectura

**Tokens y cookies:**
- `access_token` — JWT HS256, 15 min, HttpOnly, SameSite=Strict, Secure (en prod). Claims: `sub=id_doctor`, `email`, `iat`, `exp`, `jti`.
- `refresh_token` — opaco, 32 bytes random b64, 7 días, HttpOnly, SameSite=Strict, Path=`/api/auth`. Referencia a fila en tabla `refresh_token`.
- `csrf_token` — 32 bytes random, **no HttpOnly**, SameSite=Strict. Leído por JS y enviado en header `X-CSRF-Token` en cada mutación.

**Endpoints:**
- `POST /api/auth/login` — emite los 3 cookies.
- `POST /api/auth/refresh` — rota refresh, emite nuevo access y nuevo CSRF.
- `POST /api/auth/logout` — revoca refresh + borra cookies.
- `GET  /api/auth/me` — única fuente de verdad para "estoy logueado".

Los endpoints antiguos `/api/login` y `/api/logout` quedan como aliases durante 1 sprint, luego se eliminan.

## 4. Cambios de base de datos

```sql
-- 1. Refresh tokens (familias rotantes)
CREATE TABLE refresh_token (
    id_token        BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_doctor       BINARY(16)   NOT NULL,
    id_family       BINARY(16)   NOT NULL,
    token_hash      CHAR(64)     NOT NULL,         -- SHA-256 del refresh
    issued_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NOT NULL,
    used_at         TIMESTAMP        NULL,
    revoked_at      TIMESTAMP        NULL,
    user_agent      VARCHAR(255)     NULL,
    ip              VARCHAR(45)      NULL,

    UNIQUE KEY uq_token_hash (token_hash),
    INDEX idx_family (id_family),
    CONSTRAINT fk_refresh_doctor FOREIGN KEY (id_doctor)
        REFERENCES doctor (id_doctor) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Lockout por cuenta (5 fallos → 15min)
CREATE TABLE login_lockout (
    id_doctor       BINARY(16)        NOT NULL PRIMARY KEY,
    failed_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until    TIMESTAMP             NULL,
    last_failed_at  TIMESTAMP             NULL,

    CONSTRAINT fk_lockout_doctor FOREIGN KEY (id_doctor)
        REFERENCES doctor (id_doctor) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Audit log
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

Retención: cron mensual purga `auth_audit > 1 año` y `refresh_token` con `expires_at < NOW()`.

## 5. Flujos backend

### Login `POST /api/auth/login`
1. Rate limit por IP (existente, 2/hr → bloqueo 1h) se mantiene.
2. Buscar doctor por email. Si no existe → bcrypt dummy + `LOGIN_FAIL` + 401 genérico.
3. Leer `login_lockout`: si `locked_until > NOW()` → 423 + `LOGIN_FAIL`.
4. Validar `row_status = ACTIVE`. Si no → 403 + `LOGIN_FAIL`.
5. `bcrypt.CompareHashAndPassword`. Fallo → `failed_count++`. Al llegar a 5 → `locked_until = NOW()+15min`, audit `LOCKOUT`. 401.
6. Éxito → reset lockout, emitir las 3 cookies (insertando fila en `refresh_token` con nuevo `id_family`).
7. Audit `LOGIN_OK`. Responder `{ok:true}`.

### Refresh `POST /api/auth/refresh`
No requiere CSRF (idempotente desde el navegador, protegido por SameSite).
1. SHA-256(refresh recibido) → buscar en tabla.
2. No existe / expirado / revocado → 401 + `REFRESH_FAIL`.
3. `used_at != NULL` → robo: revocar toda la `id_family`, audit `REFRESH_REUSE`, 401.
4. Válido → marcar `used_at=NOW()`, emitir nuevo refresh con mismo `id_family`, nuevo access, nuevo CSRF. Audit `REFRESH_OK`.
5. **Gracia de 2s**: si llega un segundo intento con el mismo token dentro de 2s, se acepta como race de dos pestañas; fuera de 2s, se trata como robo.

### Logout `POST /api/auth/logout`
1. Requiere access válido + `X-CSRF-Token` que coincida con cookie.
2. Revocar fila viva de la familia → `revoked_at=NOW()`.
3. Borrar las 3 cookies (MaxAge=-1). Audit `LOGOUT`.
4. Si access es inválido, igual borra cookies del cliente (no falla UX) pero no toca DB.

### Me `GET /api/auth/me`
Middleware valida access → responde `{id_doctor, email, name, specialty}`.

### Middleware
- **JWT**: extrae `sub`, lo pone en `context.Context` para handlers, **re-consulta `row_status`** (índice por PK) y rechaza si != ACTIVE. Expirado → 401 con `WWW-Authenticate: Bearer error="token_expired"`.
- **CSRF**: aplicado a POST/PUT/DELETE excepto `/api/auth/login` y `/api/auth/refresh`. Compara header vs cookie con `subtle.ConstantTimeCompare`. Falla → 403.

## 6. Cambios frontend

- **`src/utils/auth.jsx`** reemplazado: expone `login`, `logout`, `getCsrfToken`, `fetchMe`. Elimina `saveToken`/`isAuthenticated` y el flag `sessionStorage`.
- **`src/context/AuthContext.jsx`** (nuevo): `{user, loading, login, logout}`. Al montar llama `fetchMe()`; en 401 intenta `/api/auth/refresh` una vez y reintenta.
- **`src/components/ProtectedRoute.jsx`** (nuevo): mientras `loading` muestra spinner; si `user=null` redirige a `/login`; si no, renderiza `<Outlet/>`. Envolver todas las rutas privadas en `App.jsx`.
- **Interceptor axios en `src/utils/api.jsx`**:
  - Request: `withCredentials: true` siempre; añade `X-CSRF-Token` en métodos no-GET.
  - Response: en 401 `token_expired` llama refresh y reintenta una vez; en 401 sin refresh válido o 423/403 redirige a `/login`; en 429 muestra mensaje de bloqueo IP.
- **`Login.jsx`** ajustado: errores diferenciados por status (401/423/429/403). Tras éxito, refresca `AuthContext` antes de navegar.
- **`SidebarMenu.jsx`**: logout usa `auth.logout()` del context.

## 7. Errores y edge cases

| Caso | Status | Body |
|---|---|---|
| Credenciales malas | 401 | `{"error":"invalid_credentials"}` |
| Cuenta bloqueada | 423 | `{"error":"account_locked","retry_after":900}` |
| Rate limit IP | 429 | `{"error":"too_many_attempts"}` |
| Doctor INACTIVE | 403 | `{"error":"account_disabled"}` |
| Access expirado | 401 | header `WWW-Authenticate: Bearer error="token_expired"` |
| Refresh inválido / reuso | 401 | `{"error":"session_expired"}` |
| CSRF mismatch | 403 | `{"error":"csrf_invalid"}` |

**Edge cases:**
- Timing attack en email enumeration → bcrypt dummy en path "email no existe".
- Robo de refresh → detección por reuso revoca la familia entera.
- Race de dos pestañas refrescando → ventana de gracia de 2s.
- Logout sin access → borra cookies del cliente, no toca DB.
- Doctor pasa a INACTIVE con sesión activa → middleware lo bloquea en el próximo request.
- Reloj torcido → tolerancia de 30s en `exp`.

## 8. Testing

**Backend (Go)** — tests de tabla por handler:
- Login OK / password mal / 5 fallos → lockout / INACTIVE → 403.
- Refresh OK / refresh reuso → familia revocada / dentro de gracia 2s.
- CSRF mismatch → 403.
- Audit log se escribe en cada path.
- Integración con `httptest.Server` + DB de prueba: flujo completo login → me → refresh → logout.

**Frontend (vitest + MSW):**
- AuthContext: 401 `token_expired` → refresh → retry de `/me`.
- ProtectedRoute: `user=null` redirige; `user` definido renderiza.
- Interceptor axios añade `X-CSRF-Token` en métodos no-GET.

**Manual:**
- Dos pestañas simultáneas.
- Timeout dejando inactivo 16 min (fuerza refresh).
- Lockout intencional con password mal × 5.

## 9. Configuración (env vars)

| Variable | Default | Descripción |
|---|---|---|
| `JWT_SECRET` | (existente) | Secreto HS256 para access tokens |
| `JWT_ACCESS_MINUTES` | `15` | TTL del access |
| `JWT_REFRESH_DAYS` | `7` | TTL del refresh |
| `LOCKOUT_THRESHOLD` | `5` | Fallos antes de bloqueo |
| `LOCKOUT_MINUTES` | `15` | Duración del bloqueo por cuenta |
| `REFRESH_GRACE_SECONDS` | `2` | Ventana para race de pestañas |

## 10. Rollout

1. Crear las 3 tablas (sin downtime).
2. Implementar nuevos handlers `/api/auth/*` en paralelo con los antiguos.
3. Desplegar frontend con `AuthContext` + `ProtectedRoute` consumiendo los nuevos endpoints.
4. Mantener `/api/login` y `/api/logout` como aliases por 1 sprint.
5. Eliminar endpoints antiguos y el flag `sessionStorage.loggedIn`.

## 11. Fuera de scope (futuras fases)

- **Fase B**: reset de contraseña por email, política de complejidad, verificación de `row_status` en signup.
- **Fase C**: 2FA / TOTP opcional para doctores.
