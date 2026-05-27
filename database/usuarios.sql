-- ============================================================
--  Pão FresQUIM — Tabela de Usuários do sistema
--  Execute no SQL Editor do Supabase APÓS schema.sql
-- ============================================================

-- Habilita a extensão pgcrypto (usada somente como fallback no Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de usuários (login do sistema)
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      SERIAL PRIMARY KEY,
  nome_exibicao   VARCHAR(100) NOT NULL,
  usuario         VARCHAR(50)  NOT NULL UNIQUE,
  senha_hash      TEXT         NOT NULL,
  perfil          VARCHAR(20)  NOT NULL DEFAULT 'ATENDENTE'
                  CHECK (perfil IN ('ADMIN', 'ATENDENTE')),
  ativo           BOOLEAN      NOT NULL DEFAULT true,
  reset_token     TEXT,
  reset_token_exp TIMESTAMP,
  criado_em       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Inserir usuários de demonstração ──────────────────────────────
-- IMPORTANTE: as senhas abaixo são hashes bcrypt da senha '1234'
-- Gerados com bcrypt.hash('1234', 10) — compatíveis com o backend Node.js
-- Para gerar novos hashes: node -e "require('bcrypt').hash('NOVA_SENHA',10).then(console.log)"

INSERT INTO usuarios (nome_exibicao, usuario, senha_hash, perfil)
VALUES
  ('Sr. Quim',       'quim',  '$2b$10$Y5Kv1S4O2Lp8N3mQzRu4COeK5fXk3hA9WwJhL6vD7mGsT8bNcPqKi', 'ADMIN'),
  ('Maria da Silva', 'maria', '$2b$10$Y5Kv1S4O2Lp8N3mQzRu4COeK5fXk3hA9WwJhL6vD7mGsT8bNcPqKi', 'ATENDENTE'),
  ('Carlos Santos',  'carlos','$2b$10$Y5Kv1S4O2Lp8N3mQzRu4COeK5fXk3hA9WwJhL6vD7mGsT8bNcPqKi', 'ATENDENTE'),
  ('Ana Oliveira',   'ana',   '$2b$10$Y5Kv1S4O2Lp8N3mQzRu4COeK5fXk3hA9WwJhL6vD7mGsT8bNcPqKi', 'ATENDENTE')
ON CONFLICT (usuario) DO NOTHING;

-- !! ATENÇÃO: O hash acima é apenas placeholder.
-- Execute o script abaixo no terminal do projeto para gerar hashes reais:
--   node -e "const b=require('bcrypt'); b.hash('1234',10).then(h=>console.log(h))"
-- Depois substitua os valores acima pelo hash gerado.

-- Verificar criação
SELECT id_usuario, nome_exibicao, usuario, perfil, ativo FROM usuarios;
