// src/routes/notafiscal.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/** GET /api/notafiscal */
router.get('/', async (req, res) => {
  const { de, ate } = req.query;
  try {
    const result = await pool.query(
      `SELECT v.id_venda, v.data_hora, v.total, v.forma_pagamento, v.nr_nota_fiscal,
              c.nome AS cliente_nome, c.cpf AS cliente_cpf,
              u.nome_exibicao AS funcionario,
              json_agg(
                json_build_object(
                  'produto', p.nome,
                  'quantidade', iv.quantidade,
                  'preco_unitario', iv.preco_unitario,
                  'subtotal', iv.subtotal
                ) ORDER BY p.nome
              ) AS itens
       FROM venda v
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
       JOIN item_venda iv ON iv.id_venda = v.id_venda
       JOIN produto p ON p.id_produto = iv.id_produto
       WHERE ($1::date IS NULL OR v.data_hora::date >= $1::date)
         AND ($2::date IS NULL OR v.data_hora::date <= $2::date)
       GROUP BY v.id_venda, c.nome, c.cpf, u.nome_exibicao
       ORDER BY v.data_hora DESC
       LIMIT 100`,
      [de || null, ate || null]
    );
    res.json({ ok: true, notas: result.rows });
  } catch (err) {
    console.error('[GET /notafiscal]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar notas fiscais.' });
  }
});

/** GET /api/notafiscal/:id */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id_venda, v.data_hora, v.total, v.forma_pagamento, v.nr_nota_fiscal,
              c.nome AS cliente_nome, c.cpf AS cliente_cpf,
              u.nome_exibicao AS funcionario,
              json_agg(
                json_build_object(
                  'produto', p.nome,
                  'quantidade', iv.quantidade,
                  'preco_unitario', iv.preco_unitario,
                  'subtotal', iv.subtotal
                )
              ) AS itens
       FROM venda v
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
       JOIN item_venda iv ON iv.id_venda = v.id_venda
       JOIN produto p ON p.id_produto = iv.id_produto
       WHERE v.id_venda = $1
       GROUP BY v.id_venda, c.nome, c.cpf, u.nome_exibicao`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, erro: 'Nota não encontrada.' });
    res.json({ ok: true, nota: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar nota.' });
  }
});

module.exports = router;