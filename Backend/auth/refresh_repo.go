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
