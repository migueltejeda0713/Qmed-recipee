package auth

import (
	"database/sql"

	"Qmed-Recipe/models"
)

func InsertAudit(db *sql.DB, ev *models.AuditEvent) error {
	var ua interface{}
	if ev.UserAgent != "" {
		ua = ev.UserAgent
	} else {
		ua = nil
	}

	if ev.IDDoctor != nil {
		_, err := db.Exec(`
			INSERT INTO auth_audit (id_doctor, email_tried, event_type, ip, user_agent)
			VALUES (UUID_TO_BIN(?, TRUE), ?, ?, ?, ?)`,
			*ev.IDDoctor, ev.EmailTried, string(ev.EventType), ev.IP, ua)
		return err
	}
	_, err := db.Exec(`
		INSERT INTO auth_audit (id_doctor, email_tried, event_type, ip, user_agent)
		VALUES (NULL, ?, ?, ?, ?)`,
		ev.EmailTried, string(ev.EventType), ev.IP, ua)
	return err
}
