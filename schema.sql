-- ============================================
-- QMED Recipe - Database Schema
-- Database: rctm (MySQL 8+)
-- IDs: UUID v4 stored as BINARY(16)
-- ============================================

CREATE DATABASE IF NOT EXISTS rctm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rctm;

-- ============================================
-- 1. Doctors
-- ============================================
CREATE TABLE doctor (
    id_doctor    BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    password     VARCHAR(255) NOT NULL,  -- store bcrypt/argon2 hashes, never plaintext
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_doctor_email (email)
) ENGINE=InnoDB;

-- ============================================
-- 2. Insurance providers
-- ============================================
CREATE TABLE insurance_provider (
    id_provider    BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    provider_name  VARCHAR(150) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_provider_name (provider_name)
) ENGINE=InnoDB;

-- ============================================
-- 3. Insurance policies
-- ============================================
CREATE TABLE insurance_policy (
    id_policy      BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_provider    BINARY(16)   NOT NULL,
    policy_number  VARCHAR(100) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_policy_number (policy_number),

    CONSTRAINT fk_policy_provider
        FOREIGN KEY (id_provider) REFERENCES insurance_provider (id_provider)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 4. Patients
-- ============================================
CREATE TABLE patient (
    id_patient      BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    birth_date      DATE         NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    document_id     VARCHAR(50)  NOT NULL,
    id_policy       BINARY(16)       NULL,
    id_doctor       BINARY(16)   NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_patient_document (document_id),
    INDEX idx_patient_doctor (id_doctor),
    FULLTEXT INDEX ft_patient_name (name),

    CONSTRAINT fk_patient_policy
        FOREIGN KEY (id_policy) REFERENCES insurance_policy (id_policy)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_patient_doctor
        FOREIGN KEY (id_doctor) REFERENCES doctor (id_doctor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 5. Laboratories
-- ============================================
CREATE TABLE laboratory (
    id_laboratory    BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    laboratory_name  VARCHAR(150) NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_laboratory_name (laboratory_name)
) ENGINE=InnoDB;

-- ============================================
-- 6. Components
-- ============================================
CREATE TABLE component (
    id_component  BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_component_name (name)
) ENGINE=InnoDB;

-- ============================================
-- 7. Medicines
-- ============================================
CREATE TABLE medicine (
    id_medicine     BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    medicine_name   VARCHAR(200) NOT NULL,
    id_component    BINARY(16)   NOT NULL,
    id_laboratory   BINARY(16)   NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_med_component (id_component),
    INDEX idx_med_laboratory (id_laboratory),

    CONSTRAINT fk_med_component
        FOREIGN KEY (id_component) REFERENCES component (id_component)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_med_laboratory
        FOREIGN KEY (id_laboratory) REFERENCES laboratory (id_laboratory)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 8. Recipes (recetas)
-- ============================================
CREATE TABLE recipe (
    id_recipe    BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_patient   BINARY(16)   NOT NULL,
    id_doctor    BINARY(16)   NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_recipe_patient (id_patient),
    INDEX idx_recipe_doctor  (id_doctor),

    CONSTRAINT fk_recipe_patient
        FOREIGN KEY (id_patient) REFERENCES patient (id_patient)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_recipe_doctor
        FOREIGN KEY (id_doctor) REFERENCES doctor (id_doctor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 9. Prescriptions
-- ============================================
CREATE TABLE prescription (
    id_prescription BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID(), TRUE)) PRIMARY KEY,
    id_recipe       BINARY(16)   NOT NULL,
    name            VARCHAR(200) NOT NULL,
    quantity        VARCHAR(100) NOT NULL,
    dosage          TEXT         NOT NULL,
    usage_instructions TEXT          NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_prescription_recipe (id_recipe),

    CONSTRAINT fk_prescription_recipe
        FOREIGN KEY (id_recipe) REFERENCES recipe (id_recipe)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- Helper views: read UUIDs as human-readable strings
-- ============================================
-- Example usage:
--   SELECT BIN_TO_UUID(id_doctor, TRUE) AS id_doctor, email FROM doctor;
--
-- To insert with a specific UUID:
--   INSERT INTO doctor (id_doctor, email, password)
--   VALUES (UUID_TO_BIN('550e8400-e29b-41d4-a716-446655440000', TRUE), 'dr@mail.com', '...');


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