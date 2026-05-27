// src/routes/ponto.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/**
 * Normaliza um registro de ponto (que tem entrada/saida separados)
 * em linhas com { tipo, data_hora } para o frontend.
 */
function normalizarRegistros(rows) {
  const resultado = [];
  for (const r of rows) {
    if (r.entrada) {
      resultado.push({
        id_ponto:        r.id_ponto,
        id_funcionario:  r.id_funcionario,
        nome:            r.nome,
        cargo:           r.cargo,
        tipo:            'entrada',
        data_hora:       r.entrada,
        data:            r.data,
        observacao:      r.observacao || '',
      });
    }
    if (r.saida) {
      resultado.push({
        id_ponto:        r.id_ponto,
        id_funcionario:  r.id_funcionario,
        nome:            r.nome,
        cargo:           r.cargo,
        tipo:            'saida',
        data_hora:       r.saida,
        data:            r.data,
        observacao:      r.observacao || '',
      });
    }
  }
  // Ordena por data_hora decrescente
  resultado.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  return resultado;
}

/** GET /api/ponto */
router.get('/', async (req, res) => {
  const { data, id_funcionario } = req.query;
  try {
    const result = await pool.query(
      `SELECT rp.id_ponto, rp.data, rp.entrada, rp.saida,
              f.id_funcionario, f.nome, f.cargo
       FROM registro_ponto rp
       JOIN funcionario f ON f.id_funcionario = rp.id_funcionario
       WHERE ($1::date IS NULL OR rp.data = $1::date)
         AND ($2::int IS NULL OR rp.id_funcionario = $2::int)
       ORDER BY rp.data DESC, rp.entrada DESC
       LIMIT 200`,
      [data || null, id_funcionario || null]
    );
    res.json({ ok: true, registros: normalizarRegistros(result.rows) });
  } catch (err) {
    console.error('[GET /ponto]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar registros.' });
  }
});

/** POST /api/ponto — registrar entrada */
router.post('/', async (req, res) => {
  const { id_funcionario, data, entrada } = req.body;
  if (!id_funcionario || !data)
    return res.status(400).json({ ok: false, erro: 'Funcionário e data são obrigatórios.' });
  try {
    const result = await pool.query(
      `INSERT INTO registro_ponto (id_funcionario, data, entrada)
       VALUES ($1, $2, $3) RETURNING *`,
      [id_funcionario, data, entrada || new Date()]
    );
    res.status(201).json({ ok: true, registro: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao registrar ponto.' });
  }
});

/** PUT /api/ponto/:id — registrar saída */
router.put('/:id', async (req, res) => {
  const { saida } = req.body;
  try {
    const result = await pool.query(
      `UPDATE registro_ponto SET saida = $1 WHERE id_ponto = $2 RETURNING *`,
      [saida || new Date(), req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, erro: 'Registro não encontrado.' });
    res.json({ ok: true, registro: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao registrar saída.' });
  }
});

/** GET /api/ponto/resumo */
router.get('/resumo', async (req, res) => {
  const { mes } = req.query;
  try {
    const result = await pool.query(
      `SELECT f.id_funcionario, f.nome, f.cargo,
              COUNT(rp.id_ponto) AS total_dias,
              COUNT(CASE WHEN rp.entrada IS NOT NULL THEN 1 END) AS entradas,
              COUNT(CASE WHEN rp.saida   IS NOT NULL THEN 1 END) AS saidas,
              COUNT(rp.id_ponto) * 2 AS total_registros,
              MIN(rp.data) AS primeiro_dia,
              MAX(rp.data) AS ultimo_dia
       FROM funcionario f
       LEFT JOIN registro_ponto rp
         ON rp.id_funcionario = f.id_funcionario
        AND ($1 = '' OR $1 IS NULL OR to_char(rp.data, 'YYYY-MM') = $1)
       WHERE f.ativo = true
       GROUP BY f.id_funcionario ORDER BY f.nome`,
      [mes || null]
    );
    res.json({ ok: true, resumo: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao gerar resumo.' });
  }
});

module.exports = router;
