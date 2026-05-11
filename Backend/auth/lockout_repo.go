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

// RegisterFail increments failed_count for this doctor atomically. If the new
// count reaches threshold, locks the account for lockDuration. Returns
// locked=true if the account is currently locked after the increment.
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
