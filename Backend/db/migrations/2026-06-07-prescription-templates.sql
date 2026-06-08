-- ============================================
-- Prescription templates (plantillas por doctor)
-- Cada doctor mantiene su propio catálogo de
-- prescripciones frecuentes para autocompletar
-- al crear recetas.
-- row_status_id=2 (ACTIVE) | =3 (INACTIVE/soft-delete)
-- ============================================
CREATE TABLE IF NOT EXISTS prescription_template (
    id_template         BINARY(16)       NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_doctor           BINARY(16)       NOT NULL,
    id_medicine         BINARY(16)       NOT NULL,
    dosage              VARCHAR(200)     NOT NULL,
    usage_instructions  VARCHAR(500)         NULL,
    row_status_id       TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_presc_tmpl_doctor
        FOREIGN KEY (id_doctor)   REFERENCES doctor      (id_doctor)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_presc_tmpl_medicine
        FOREIGN KEY (id_medicine) REFERENCES medicine    (id_medicine)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_presc_tmpl_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    INDEX idx_presc_tmpl_doctor (id_doctor)
) ENGINE=InnoDB;
