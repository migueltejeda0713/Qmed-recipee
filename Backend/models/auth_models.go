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

type AuditEvent struct {
	IDDoctor   *string
	EmailTried string
	EventType  AuditEventType
	IP         string
	UserAgent  string
}
