-- Migration 0000_transjap_init.sql
-- TRANSJAP Sistema de Horímetro — Esquema Relacional de Dados

CREATE TABLE IF NOT EXISTS frotas (
    id SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL UNIQUE,
    descricao VARCHAR(255) NOT NULL,
    casas_decimais INTEGER NOT NULL DEFAULT 1,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispositivos (
    id UUID PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    apelido VARCHAR(100) NOT NULL,
    ultimo_contato TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leituras (
    id UUID PRIMARY KEY, -- gerado no celular (chave de idempotência)
    frota_id INTEGER NOT NULL REFERENCES frotas(id) ON DELETE RESTRICT,
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE RESTRICT,
    valor_confirmado NUMERIC(10, 1) NOT NULL,
    valor_ocr NUMERIC(10, 1) NOT NULL,
    capturado_em TIMESTAMPTZ NOT NULL,
    recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'Ok', -- 'Ok', 'Alerta', 'Revisada'
    lat NUMERIC(9, 6) NULL, -- nulo no MVP
    lng NUMERIC(9, 6) NULL, -- nulo no MVP
    observacao_alerta TEXT NULL
);

-- Índice crítico para histórico ordenado e alta performance de consulta
CREATE INDEX IF NOT EXISTS idx_leituras_frota_captura 
    ON leituras (frota_id, capturado_em DESC);

CREATE TABLE IF NOT EXISTS fotos (
    leitura_id UUID PRIMARY KEY REFERENCES leituras(id) ON DELETE CASCADE,
    chave_bucket VARCHAR(255) NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    bytes INTEGER NOT NULL,
    enviada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fechamentos_dia (
    id SERIAL PRIMARY KEY,
    frota_id INTEGER NOT NULL REFERENCES frotas(id) ON DELETE CASCADE,
    dia DATE NOT NULL,
    inicial NUMERIC(10, 1) NOT NULL,
    final NUMERIC(10, 1) NOT NULL,
    horas NUMERIC(10, 1) NOT NULL,
    qtd_leituras INTEGER NOT NULL DEFAULT 1,
    dias_sem_leitura_anteriores INTEGER NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_frota_dia UNIQUE (frota_id, dia)
);

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    quando TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quem VARCHAR(255) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    alvo VARCHAR(255) NOT NULL,
    detalhes TEXT NULL
);
