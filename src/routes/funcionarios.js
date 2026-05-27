// src/routes/funcionarios.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

// Pasta para salvar atestados (cria se não existir)
const UPLOADS_DIR = path.join(__dirname, '../../uploads/atestados');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** GET /api/funcionarios */
router.get('/', async (req, res) => {
  const { busca = '' } = req.query;
  try {
    const result = await pool.query(
      `SELECT id_funcionario, nome, cpf, cargo, telefone,
              tel_emergencia, tel_emergencia AS telefone_emergencia,
              endereco, data_admissao, licencas, ferias, faltas, ativo
       FROM funcionario
       WHERE ativo = true
         AND ($1 = '' OR nome ILIKE $2 OR cpf ILIKE $2 OR cargo ILIKE $2)
       ORDER BY nome ASC`,
      [busca, `%${busca}%`]
    );
    res.json({ ok: true, funcionarios: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar funcionários.' });
  }
});

/** GET /api/funcionarios/:id */
router.get('/:id', async (req, res) => {
  try {
    const func = await pool.query(
      'SELECT * FROM funcionario WHERE id_funcionario = $1',
      [req.params.id]
    );
    if (!func.rows.length)
      return res.status(404).json({ ok: false, erro: 'Funcionário não encontrado.' });

    const ponto = await pool.query(
      `SELECT * FROM registro_ponto WHERE id_funcionario = $1 ORDER BY data DESC LIMIT 30`,
      [req.params.id]
    );
    const atestados = await pool.query(
      `SELECT * FROM atestado WHERE id_funcionario = $1 ORDER BY data_atestado DESC`,
      [req.params.id]
    );

    res.json({
      ok: true,
      funcionario: func.rows[0],
      ponto: ponto.rows,
      atestados: atestados.rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar funcionário.' });
  }
});

/** POST /api/funcionarios */
router.post('/', async (req, res) => {
  const { nome, cpf, cargo, telefone, endereco, data_admissao, licencas } = req.body;
  const tel_emergencia = req.body.tel_emergencia || req.body.telefone_emergencia;

  if (!nome || !cpf || !cargo || !data_admissao)
    return res.status(400).json({ ok: false, erro: 'Nome, CPF, cargo e data de admissão são obrigatórios.' });

  try {
    const dup = await pool.query(
      'SELECT id_funcionario FROM funcionario WHERE cpf = $1',
      [cpf.replace(/\D/g, '')]
    );
    if (dup.rows.length)
      return res.status(409).json({ ok: false, erro: 'Já existe um funcionário com este CPF.' });

    const result = await pool.query(
      `INSERT INTO funcionario
         (nome, cpf, cargo, telefone, tel_emergencia, endereco, data_admissao, licencas, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING *`,
      [
        nome.trim(),
        cpf.replace(/\D/g, ''),
        cargo.toUpperCase(),
        telefone || null,
        tel_emergencia || null,
        endereco || null,
        data_admissao,
        licencas || null,
      ]
    );
    res.status(201).json({ ok: true, funcionario: result.rows[0] });
  } catch (err) {
    console.error('[POST /funcionarios]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao cadastrar funcionário: ' + err.message });
  }
});

/** PUT /api/funcionarios/:id */
router.put('/:id', async (req, res) => {
  const { nome, cargo, telefone, endereco, ativo, licencas, ferias, faltas } = req.body;
  const tel_emergencia = req.body.tel_emergencia || req.body.telefone_emergencia;
  try {
    const result = await pool.query(
      `UPDATE funcionario SET
         nome           = COALESCE($1,  nome),
         cargo          = COALESCE($2,  cargo),
         telefone       = COALESCE($3,  telefone),
         tel_emergencia = COALESCE($4,  tel_emergencia),
         endereco       = COALESCE($5,  endereco),
         ativo          = COALESCE($6,  ativo),
         licencas       = COALESCE($7,  licencas),
         ferias         = COALESCE($8,  ferias),
         faltas         = COALESCE($9,  faltas)
       WHERE id_funcionario = $10 RETURNING *`,
      [
        nome,
        cargo ? cargo.toUpperCase() : null,
        telefone,
        tel_emergencia,
        endereco,
        ativo,
        licencas,
        ferias,
        faltas !== undefined ? Number(faltas) : null,
        req.params.id,
      ]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Funcionário não encontrado.' });
    res.json({ ok: true, funcionario: result.rows[0] });
  } catch (err) {
    console.error('[PUT /funcionarios]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao atualizar funcionário: ' + err.message });
  }
});

/**
 * POST /api/funcionarios/:id/atestado
 * Body: multipart/form-data com:
 *   - data_atestado (string date)
 *   - observacoes   (string, opcional)
 *   - arquivo       (base64 string, opcional) — frontend envia como JSON com base64
 * Ou JSON simples (sem arquivo):
 *   { data_atestado, observacoes }
 */
router.post('/:id/atestado', async (req, res) => {
  const id_funcionario = req.params.id;
  const { data_atestado, observacoes, arquivo_base64, arquivo_nome } = req.body;

  if (!data_atestado)
    return res.status(400).json({ ok: false, erro: 'Data do atestado é obrigatória.' });

  try {
    let arquivo_path = null;
    let nome_arquivo = null;

    // Salvar arquivo se enviado como base64
    if (arquivo_base64 && arquivo_nome) {
      const ext      = path.extname(arquivo_nome).toLowerCase();
      const allowed  = ['.pdf', '.jpg', '.jpeg', '.png'];
      if (!allowed.includes(ext))
        return res.status(400).json({ ok: false, erro: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' });

      const nomeUnico = `atestado_${id_funcionario}_${Date.now()}${ext}`;
      const filePath  = path.join(UPLOADS_DIR, nomeUnico);
      const buffer    = Buffer.from(arquivo_base64, 'base64');
      fs.writeFileSync(filePath, buffer);
      arquivo_path = `/uploads/atestados/${nomeUnico}`;
      nome_arquivo = arquivo_nome;
    }

    let result;
    try {
      result = await pool.query(
        `INSERT INTO atestado (id_funcionario, data_atestado, observacoes, arquivo_path, arquivo_nome)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id_funcionario, data_atestado, observacoes || null, arquivo_path, nome_arquivo]
      );
    } catch (colErr) {
      // Fallback: coluna arquivo_nome pode não existir em bancos antigos
      if (colErr.message && colErr.message.includes('arquivo_nome')) {
        result = await pool.query(
          `INSERT INTO atestado (id_funcionario, data_atestado, observacoes, arquivo_path)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [id_funcionario, data_atestado, observacoes || null, arquivo_path]
        );
      } else {
        throw colErr;
      }
    }
    res.status(201).json({ ok: true, atestado: result.rows[0] });
  } catch (err) {
    console.error('[POST /funcionarios/:id/atestado]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar atestado.' });
  }
});

module.exports = router;
