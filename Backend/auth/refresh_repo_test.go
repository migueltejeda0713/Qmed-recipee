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
