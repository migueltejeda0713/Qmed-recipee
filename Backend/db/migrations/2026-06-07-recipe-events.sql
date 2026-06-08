-- ============================================
-- Recipe event log (RF-18 trazabilidad)
-- Registra cada evento del ciclo de vida de
-- una receta: CREATED, DRAFT_UPDATED, ISSUED,
-- PRINTED, CANCELLED.
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_event (
    id_event    BINARY(16)  NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_recipe   BINARY(16)  NOT NULL,
    id_doctor   BINARY(16)  NOT NULL,
    event_type  VARCHAR(30) NOT NULL,
    event_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_recipe_event_recipe (id_recipe),

    CONSTRAINT fk_recipe_event_recipe
        FOREIGN KEY (id_recipe) REFERENCES recipe (id_recipe) ON DELETE CASCADE,

    CONSTRAINT fk_recipe_event_doctor
        FOREIGN KEY (id_doctor) REFERENCES doctor  (id_doctor) ON DELETE CASCADE
) ENGINE=InnoDB;
