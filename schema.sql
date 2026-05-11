-- ============================================
-- QMED Recipe - Database Schema
-- Database: rctm (MySQL 8+)
-- IDs: UUID v4 stored as BINARY(16)
-- ============================================
DROP DATABASE IF EXISTS rctm;

CREATE DATABASE IF NOT EXISTS rctm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rctm;

-- ============================================
-- 1. Row Status (catálogo de estados)
-- ============================================
-- Tabla de referencia inmutable en runtime; no lleva UUID.
-- Restricciones de quién puede cambiar qué estado se aplican en el backend.
--
--  Aplica a:
--    DRAFT        → recetas (borrador antes de finalizar)
--    ACTIVE       → todas las tablas (estado por defecto al crear)
--    INACTIVE     → pacientes, medicamentos, laboratorios, componentes (soft-delete)
--    ARCHIVED     → pacientes (solo el doctor que los tiene asignados puede archivar)
--    ISSUED       → recetas (emitida formalmente, documento estable e inmutable)
--    PRINTED      → recetas (impresa y entregada al paciente) [legacy, no usado como estado principal]
--    CANCELLED    → recetas (anulada por el doctor)
--    EXPIRED      → recetas (venció el período de validez sin ser usada)
--    DISCONTINUED → medicamentos, laboratorios, componentes
--                   (ya no disponible pero preserva historial)
-- ============================================
CREATE TABLE row_status (
    id_status    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    status_code  VARCHAR(20)  NOT NULL,
    status_name  VARCHAR(60)  NOT NULL,
    description  VARCHAR(255)     NULL,

    UNIQUE KEY uq_status_code (status_code)
) ENGINE=InnoDB;

INSERT INTO row_status (status_code, status_name, description) VALUES
('DRAFT',        'Borrador',       'Registro creado pero aún no finalizado'),
('ACTIVE',       'Activo',         'Registro disponible y operativo'),
('INACTIVE',     'Inactivo',       'Soft-delete general; visible en historial'),
('ARCHIVED',     'Archivado',      'Paciente archivado por su doctor asignado'),
('ISSUED',       'Emitida',        'Receta emitida formalmente, inmutable'),
('PRINTED',      'Impresa',        'Receta impresa y entregada al paciente'),
('CANCELLED',    'Cancelada',      'Receta anulada por el doctor'),
('EXPIRED',      'Expirada',       'Receta no usada dentro de su período de validez'),
('DISCONTINUED', 'Descontinuado',  'Elemento fuera de uso; solo lectura en historial');

-- ============================================
-- 2. Doctors
-- ============================================
CREATE TABLE doctor (
    id_doctor       BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    password        VARCHAR(255)    NOT NULL,  -- bcrypt/argon2, nunca texto plano
    specialty       VARCHAR(150)        NULL,
    license_number  VARCHAR(50)     NOT NULL,
    phone           VARCHAR(20)         NULL,
    row_status_id   TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_doctor_email    (email),
    UNIQUE KEY uq_doctor_license  (license_number),

    CONSTRAINT fk_doctor_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 3. Insurance providers
-- ============================================
CREATE TABLE insurance_provider (
    id_provider    BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    provider_name  VARCHAR(150)    NOT NULL,
    row_status_id  TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_provider_name (provider_name),

    CONSTRAINT fk_provider_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 4. Insurance policies
-- ============================================
CREATE TABLE insurance_policy (
    id_policy      BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_provider    BINARY(16)      NOT NULL,
    policy_number  VARCHAR(100)    NOT NULL,
    row_status_id  TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_policy_number (policy_number),

    CONSTRAINT fk_policy_provider
        FOREIGN KEY (id_provider) REFERENCES insurance_provider (id_provider)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_policy_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 5. Patients
-- ============================================
-- Nota: ARCHIVED solo puede ser aplicado por el doctor dueño del paciente (id_doctor).
--       Esta restricción se valida en el backend, no en la base de datos.
-- ============================================
CREATE TABLE patient (
    id_patient      BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    birth_date      DATE            NOT NULL,
    phone           VARCHAR(20)     NOT NULL,
    document_id     VARCHAR(50)     NOT NULL,
    id_policy       BINARY(16)          NULL,
    id_doctor       BINARY(16)      NOT NULL,
    row_status_id   TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_patient_document (document_id),
    INDEX idx_patient_doctor       (id_doctor),
    FULLTEXT INDEX ft_patient_name (name),

    CONSTRAINT fk_patient_policy
        FOREIGN KEY (id_policy) REFERENCES insurance_policy (id_policy)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_patient_doctor
        FOREIGN KEY (id_doctor) REFERENCES doctor (id_doctor)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_patient_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 6. Laboratories
-- ============================================
CREATE TABLE laboratory (
    id_laboratory    BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    laboratory_name  VARCHAR(150)    NOT NULL,
    row_status_id    TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_laboratory_name (laboratory_name),

    CONSTRAINT fk_laboratory_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 7. Components
-- ============================================
CREATE TABLE component (
    id_component  BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    name          VARCHAR(150)    NOT NULL,
    row_status_id TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_component_name (name),

    CONSTRAINT fk_component_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 8. Medicines
-- ============================================
CREATE TABLE medicine (
    id_medicine     BINARY(16)      NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    medicine_name   VARCHAR(200)    NOT NULL,
    id_component    BINARY(16)      NOT NULL,
    id_laboratory   BINARY(16)      NOT NULL,
    row_status_id   TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- ACTIVE
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_med_component  (id_component),
    INDEX idx_med_laboratory (id_laboratory),
    FULLTEXT INDEX ft_medicine_name (medicine_name),

    CONSTRAINT fk_med_component
        FOREIGN KEY (id_component) REFERENCES component (id_component)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_med_laboratory
        FOREIGN KEY (id_laboratory) REFERENCES laboratory (id_laboratory)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_medicine_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 9. Recipes (recetas)
-- ============================================
CREATE TABLE recipe (
    id_recipe                  BINARY(16)       NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    recipe_number              VARCHAR(32)          NULL,
    id_patient                 BINARY(16)       NOT NULL,
    id_doctor                  BINARY(16)       NOT NULL,
    row_status_id              TINYINT UNSIGNED NOT NULL DEFAULT 1,  -- DRAFT
    general_notes              TEXT                 NULL,

    doctor_name_snapshot       VARCHAR(200)         NULL,
    doctor_license_snapshot    VARCHAR(50)          NULL,
    patient_name_snapshot      VARCHAR(200)         NULL,
    patient_document_snapshot  VARCHAR(50)          NULL,

    issued_at                  TIMESTAMP            NULL,
    cancelled_at               TIMESTAMP            NULL,
    cancellation_reason        VARCHAR(255)         NULL,
    expires_at                 TIMESTAMP            NULL,

    printed_at                 TIMESTAMP            NULL,
    print_count                INT UNSIGNED     NOT NULL DEFAULT 0,

    created_at                 TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_recipe_number (recipe_number),
    INDEX idx_recipe_patient (id_patient),
    INDEX idx_recipe_doctor  (id_doctor),
    INDEX idx_recipe_status  (row_status_id),

    CONSTRAINT fk_recipe_patient
        FOREIGN KEY (id_patient) REFERENCES patient (id_patient)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_recipe_doctor
        FOREIGN KEY (id_doctor) REFERENCES doctor (id_doctor)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_recipe_status
        FOREIGN KEY (row_status_id) REFERENCES row_status (id_status)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 9b. Recipe number sequence (atomic generator per year)
-- ============================================
CREATE TABLE recipe_sequence (
    year         SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
    last_number  INT UNSIGNED      NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ============================================
-- 10. Prescriptions
-- ============================================
-- Las prescripciones heredan el ciclo de vida de su receta (ON DELETE CASCADE).
-- No tienen row_status propio: si la receta se cancela/expira, las líneas quedan
-- intactas para auditoría pero ya no son editables.
-- ============================================
CREATE TABLE prescription (
    id_prescription    BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_recipe          BINARY(16)   NOT NULL,
    id_medicine        BINARY(16)       NULL,
    name               VARCHAR(200) NOT NULL,
    quantity           VARCHAR(100) NOT NULL,
    dosage             TEXT         NOT NULL,
    usage_instructions TEXT             NULL,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_prescription_recipe   (id_recipe),
    INDEX idx_prescription_medicine (id_medicine),

    CONSTRAINT fk_prescription_recipe
        FOREIGN KEY (id_recipe) REFERENCES recipe (id_recipe)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_prescription_medicine
        FOREIGN KEY (id_medicine) REFERENCES medicine (id_medicine)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- Seed: Insurance providers
-- ============================================
INSERT INTO insurance_provider (provider_name) VALUES
('Seguro Nacional de Salud (SeNaSa)'),
('Primera ARS Humano'),
('MAPFRE Salud ARS'),
('ARS Universal'),
('ARS Futuro'),
('ARS SEMMA'),
('ARS La Monumental'),
('ARS Renacer'),
('ARS Reservas'),
('ARS SIMAG'),
('ARS APS'),
('ARS Colegio Médico Dominicano (CMD)'),
('Grupo Médico Asociado ARS (GMA)'),
('ARS Yunen'),
('ARS Meta Salud');





