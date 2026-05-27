// src/routes/produtos.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/** GET /api/produtos */
router.get('/', async (req, res) => {
  const { busca = '', categoria = '' } = req.query;
  try {
    const result = await pool.query(
      `SELECT id_produto, nome, categoria, preco_unitario, cod_barras, unidade, descricao
       FROM produto
       WHERE ($1 = '' OR nome ILIKE $2 OR cod_barras ILIKE $2)
         AND ($3 = '' OR categoria = $3)
       ORDER BY categoria ASC, nome ASC`,
      [busca, `%${busca}%`, categoria]
    );
    res.json({ ok: true, produtos: result.rows });
  } catch (err) {
    console.error('[GET /produtos]', err.message);
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/** GET /api/produtos/categorias */
router.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT categoria, COUNT(*) AS total FROM produto GROUP BY categoria ORDER BY total DESC`
    );
    res.json({ ok: true, categorias: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/** GET /api/produtos/:id */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produto WHERE id_produto = $1', [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, produto: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/** POST /api/produtos */
router.post('/', async (req, res) => {
  const { nome, categoria, preco_unitario, cod_barras, unidade, descricao } = req.body;
  if (!nome || !preco_unitario || !unidade)
    return res.status(400).json({ ok: false, erro: 'Nome, preço e unidade são obrigatórios.' });
  try {
    const result = await pool.query(
      `INSERT INTO produto (nome, categoria, preco_unitario, cod_barras, unidade, descricao)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome.trim(), categoria || 'Geral', preco_unitario, cod_barras || null, unidade, descricao || null]
    );
    res.status(201).json({ ok: true, produto: result.rows[0] });
  } catch (err) {
    console.error('[POST /produtos]', err.message);
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/** PUT /api/produtos/:id */
router.put('/:id', async (req, res) => {
  const { nome, categoria, preco_unitario, cod_barras, unidade, descricao } = req.body;
  try {
    const result = await pool.query(
      `UPDATE produto
       SET nome           = COALESCE($1, nome),
           categoria      = COALESCE($2, categoria),
           preco_unitario = COALESCE($3, preco_unitario),
           cod_barras     = COALESCE($4, cod_barras),
           unidade        = COALESCE($5, unidade),
           descricao      = COALESCE($6, descricao)
       WHERE id_produto = $7 RETURNING *`,
      [nome, categoria, preco_unitario, cod_barras, unidade, descricao, req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, produto: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/** DELETE /api/produtos/:id */
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM produto WHERE id_produto = $1 RETURNING id_produto',
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
