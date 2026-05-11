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
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

func TestInsertAudit_WithoutDoctorID(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`INSERT INTO auth_audit`).
		WithArgs("ghost@x.com", "LOGIN_FAIL", "1.2.3.4", "ua").
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
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

func TestInsertAudit_EmptyUserAgentInsertsNil(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec(`INSERT INTO auth_audit`).
		WithArgs("doc", "x@y.com", "LOGIN_OK", "1.2.3.4", nil).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := InsertAudit(db, &models.AuditEvent{
		IDDoctor:   strPtr("doc"),
		EmailTried: "x@y.com",
		EventType:  models.AuditLoginOK,
		IP:         "1.2.3.4",
		UserAgent:  "",
	})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
}

func strPtr(s string) *string { return &s }
