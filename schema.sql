-- =============================================================================
-- SCHEMA.SQL — PostgreSQL schema for BizzCheck Bot (v2)
-- =============================================================================
-- Rescris complet: blocuri, domenii, intrebari bilingve, scoring per bloc
-- Usage: psql -U postgres -d bizzcheck_bot -f schema.sql
-- =============================================================================

-- 1. DOMENII
CREATE TABLE IF NOT EXISTS domenii (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name_ro     VARCHAR(200) NOT NULL,
    name_ru     VARCHAR(200) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO domenii (code, name_ro, name_ru) VALUES
('productie',   'Producere',                'Производство'),
('comert',      'Comerț',                   'Торговля'),
('servicii',    'Servicii',                 'Услуги (консалтинг, образование, юридические, бухгалтерские и другие профессиональные услуги)'),
('horeca',      'HoReCa',                  'Рестораны и гостиницы'),
('it',          'IT / Servicii Digitale',   'IT и цифровые сервисы (software, SaaS, платформы, digital-продукты)'),
('agricultura', 'Agricultură',              'Сельское хозяйство'),
('transport',   'Transport și Logistică',   'Транспорт и логистика'),
('medical',     'Medical / Farmaceutic',    'Медицина и фармацевтика'),
('alt',         'Alt domeniu',              'Другая сфера')
ON CONFLICT (code) DO NOTHING;

-- 2. BLOCURI
CREATE TABLE IF NOT EXISTS blocuri (
    id       SERIAL PRIMARY KEY,
    name_ro  VARCHAR(200) NOT NULL,
    name_ru  VARCHAR(200) NOT NULL,
    ordine   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_blocuri_ordine ON blocuri (ordine);

-- 3. INTREBARI
CREATE TABLE IF NOT EXISTS intrebari (
    id       SERIAL PRIMARY KEY,
    bloc_id  INTEGER NOT NULL REFERENCES blocuri(id),
    ordine   INTEGER NOT NULL,
    text_ro  TEXT NOT NULL,
    text_ru  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_intrebari_bloc ON intrebari (bloc_id);
CREATE INDEX IF NOT EXISTS ix_intrebari_ordine ON intrebari (ordine);

-- 4. OPTIUNI
CREATE TABLE IF NOT EXISTS optiuni (
    id                  SERIAL PRIMARY KEY,
    intrebare_id        INTEGER NOT NULL REFERENCES intrebari(id),
    ordine_opt          INTEGER NOT NULL DEFAULT 0,
    text_ro             VARCHAR(200) NOT NULL,
    text_ru             VARCHAR(200) NOT NULL,
    valoare             NUMERIC(5,2) NOT NULL DEFAULT 0,
    next_intrebare_id   INTEGER REFERENCES intrebari(id)
);
CREATE INDEX IF NOT EXISTS ix_optiuni_intrebare ON optiuni (intrebare_id);

-- 5. USERS
CREATE TABLE IF NOT EXISTS users (
    id                      SERIAL PRIMARY KEY,
    telegram_id             BIGINT NOT NULL UNIQUE,
    username                VARCHAR(50),
    first_name              VARCHAR(50),
    language                VARCHAR(5),
    domeniu_id              INTEGER REFERENCES domenii(id),
    numar_angajati          INTEGER,
    current_intrebare_id    INTEGER REFERENCES intrebari(id),
    test_completed          BOOLEAN NOT NULL DEFAULT FALSE,
    company_name            VARCHAR(100),
    email_company           VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS ix_users_telegram ON users (telegram_id);

-- 6. RASPUNSURI
CREATE TABLE IF NOT EXISTS raspunsuri (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    intrebare_id    INTEGER NOT NULL REFERENCES intrebari(id),
    optiune_id      INTEGER NOT NULL REFERENCES optiuni(id),
    valoare         NUMERIC(5,2) NOT NULL DEFAULT 0,
    UNIQUE(user_id, intrebare_id)
);
CREATE INDEX IF NOT EXISTS ix_raspunsuri_user ON raspunsuri (user_id);

-- 7. SCORURI BLOC
CREATE TABLE IF NOT EXISTS scoruri_bloc (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    bloc_id         INTEGER NOT NULL REFERENCES blocuri(id),
    nr_intrebari    INTEGER NOT NULL,
    suma_valori     NUMERIC(10,2) NOT NULL,
    scor_procent    NUMERIC(5,2) NOT NULL,
    UNIQUE(user_id, bloc_id)
);
CREATE INDEX IF NOT EXISTS ix_scoruri_bloc_user ON scoruri_bloc (user_id);

-- 8. SCOR FINAL
CREATE TABLE IF NOT EXISTS scor_final (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    nr_blocuri      INTEGER NOT NULL,
    suma_scoruri    NUMERIC(10,2) NOT NULL,
    scor_total      NUMERIC(5,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_scor_final_user ON scor_final (user_id);
