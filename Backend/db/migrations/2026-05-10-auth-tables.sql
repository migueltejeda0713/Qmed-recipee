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
