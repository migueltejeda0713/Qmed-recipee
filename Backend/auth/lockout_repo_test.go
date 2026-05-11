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
		WithArgs("doc", 5, 900).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// RegisterFail re-reads after the increment to decide locked/not.
	mock.ExpectQuery(`SELECT .*FROM login_lockout WHERE id_doctor`).
		WithArgs("doc").
		WillReturnRows(sqlmock.NewRows([]string{"failed_count", "locked_until", "last_failed_at"}).
			AddRow(1, nil, time.Now()))

	locked, err := RegisterFail(db, "doc", 5, 15*time.Minute)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if locked {
		t.Error("first fail must not lock")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
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
