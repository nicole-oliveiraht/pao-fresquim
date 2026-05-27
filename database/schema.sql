-- database/schema.sql
-- Padaria Pão FresQUIM — Script de criação das tabelas
-- Execute ANTES de usuarios.sql

-- ============================================
-- TABELA: funcionario
-- ============================================
CREATE TABLE IF NOT EXISTS funcionario (
  id_funcionario  SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cpf             CHAR(11)     NOT NULL UNIQUE,
  cargo           VARCHAR(20)  NOT NULL
                  CHECK (cargo IN ('ATENDENTE','PADEIRO','ADMINISTRADOR','CAIXA','GERENTE')),
  telefone        VARCHAR(20),
  endereco        TEXT,
  tel_emergencia  VARCHAR(20),
  data_admissao   DATE         NOT NULL,
  licencas        TEXT,
  ferias          TEXT,        -- observações sobre férias
  faltas          INTEGER      NOT NULL DEFAULT 0,
  ativo           BOOLEAN      NOT NULL DEFAULT true
);

-- ============================================
-- TABELA: produto  (RF04 inclui categoria)
-- ============================================
CREATE TABLE IF NOT EXISTS produto (
  id_produto      SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  categoria       VARCHAR(50)  NOT NULL DEFAULT 'Geral'
                  CHECK (categoria IN ('Pães','Bolos','Salgados','Bebidas','Doces','Frios','Outros','Geral')),
  preco_unitario  DECIMAL(10,2) NOT NULL,
  cod_barras      VARCHAR(50)  UNIQUE,
  unidade         VARCHAR(20)  NOT NULL
                  CHECK (unidade IN ('kg','unidade','gramas','pacote')),
  descricao       TEXT
);

-- ============================================
-- TABELA: cliente
-- ============================================
CREATE TABLE IF NOT EXISTS cliente (
  id_cliente      SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cpf             CHAR(11)     NOT NULL UNIQUE,
  telefone        VARCHAR(20),
  email           VARCHAR(100),
  endereco        TEXT,
  status_serasa   VARCHAR(20)  NOT NULL DEFAULT 'LIMPO'
                  CHECK (status_serasa IN ('LIMPO','NEGATIVADO')),
  total_devido    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  criado_em       TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: venda
-- ============================================
CREATE TABLE IF NOT EXISTS venda (
  id_venda        SERIAL PRIMARY KEY,
  data_hora       TIMESTAMP    NOT NULL DEFAULT NOW(),
  total           DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(20)  NOT NULL
                  CHECK (forma_pagamento IN ('DINHEIRO','DEBITO','CREDITO','PIX','FIADO')),
  nr_nota_fiscal  VARCHAR(50),
  id_cliente      INTEGER REFERENCES cliente(id_cliente),
  id_usuario      INTEGER NOT NULL REFERENCES usuarios(id_usuario)
);

-- ============================================
-- TABELA: item_venda
-- ============================================
CREATE TABLE IF NOT EXISTS item_venda (
  id_item         SERIAL PRIMARY KEY,
  id_venda        INTEGER NOT NULL REFERENCES venda(id_venda),
  id_produto      INTEGER NOT NULL REFERENCES produto(id_produto),
  quantidade      DECIMAL(10,3) NOT NULL,
  preco_unitario  DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL
);

-- ============================================
-- TABELA: registro_ponto
-- ============================================
CREATE TABLE IF NOT EXISTS registro_ponto (
  id_ponto        SERIAL PRIMARY KEY,
  id_funcionario  INTEGER NOT NULL REFERENCES funcionario(id_funcionario),
  data            DATE    NOT NULL,
  entrada         TIMESTAMP,
  saida           TIMESTAMP
);

-- ============================================
-- TABELA: atestado
-- ============================================
CREATE TABLE IF NOT EXISTS atestado (
  id_atestado     SERIAL PRIMARY KEY,
  id_funcionario  INTEGER NOT NULL REFERENCES funcionario(id_funcionario),
  data_atestado   DATE    NOT NULL,
  arquivo_path    VARCHAR(500),   -- caminho ou URL do arquivo
  arquivo_nome    VARCHAR(255),   -- nome original do arquivo
  observacoes     TEXT,
  criado_em       TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: notificacao  (RF21/RF22)
-- ============================================
CREATE TABLE IF NOT EXISTS notificacao (
  id_notificacao  SERIAL PRIMARY KEY,
  id_cliente      INTEGER NOT NULL REFERENCES cliente(id_cliente),
  data_envio      TIMESTAMP NOT NULL DEFAULT NOW(),
  canal           VARCHAR(20) NOT NULL
                  CHECK (canal IN ('WHATSAPP','EMAIL','SMS')),
  mensagem        TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('ENVIADA','FALHOU','PENDENTE'))
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_venda_data_hora    ON venda(data_hora);
CREATE INDEX IF NOT EXISTS idx_item_id_produto    ON item_venda(id_produto);
CREATE INDEX IF NOT EXISTS idx_venda_id_usuario   ON venda(id_usuario);
CREATE INDEX IF NOT EXISTS idx_cliente_cpf        ON cliente(cpf);
CREATE INDEX IF NOT EXISTS idx_ponto_funcionario  ON registro_ponto(id_funcionario);
CREATE INDEX IF NOT EXISTS idx_ponto_data         ON registro_ponto(data);
CREATE INDEX IF NOT EXISTS idx_produto_categoria  ON produto(categoria);
CREATE INDEX IF NOT EXISTS idx_notif_cliente      ON notificacao(id_cliente);

-- ============================================
-- TABELA: pagamento_fiado
-- ============================================
CREATE TABLE IF NOT EXISTS pagamento_fiado (
  id_pagamento    SERIAL PRIMARY KEY,
  id_cliente      INTEGER NOT NULL REFERENCES cliente(id_cliente),
  valor           DECIMAL(10,2) NOT NULL,
  data_pagamento  DATE NOT NULL,
  observacoes     TEXT,
  registrado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pgto_fiado_data ON pagamento_fiado(data_pagamento);

-- ============================================
-- MIGRAÇÃO SEGURA (para bancos já existentes)
-- Execute linha a linha se o banco já tiver dados
-- ============================================
-- ALTER TABLE produto      ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) NOT NULL DEFAULT 'Geral';
-- ALTER TABLE produto      ADD COLUMN IF NOT EXISTS descricao TEXT;
-- ALTER TABLE funcionario  ADD COLUMN IF NOT EXISTS ferias TEXT;
-- ALTER TABLE funcionario  ADD COLUMN IF NOT EXISTS faltas INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE funcionario  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE atestado ADD COLUMN IF NOT EXISTS arquivo_nome VARCHAR(255);
ALTER TABLE atestado ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW();
-- ALTER TABLE cliente      ADD COLUMN IF NOT EXISTS endereco TEXT;
