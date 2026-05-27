// src/routes/vendas.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/** POST /api/vendas */
router.post('/', async (req, res) => {
  const { id_cliente, itens } = req.body;
  const forma_pagamento = req.body.forma_pagamento?.toUpperCase();
  const id_usuario = req.session?.usuario?.id || null;

  if (!forma_pagamento || !itens || !itens.length)
    return res.status(400).json({ ok: false, erro: 'Forma de pagamento e itens são obrigatórios.' });
  if (forma_pagamento === 'FIADO' && !id_cliente)
    return res.status(400).json({ ok: false, erro: 'Para venda fiado é necessário informar o cliente.' });
  if (!id_usuario)
    return res.status(401).json({ ok: false, erro: 'Sessão expirada. Faça login novamente.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const total = itens.reduce((s, i) => s + (Number(i.quantidade) * Number(i.preco_unitario)), 0);

    const vendaRes = await client.query(
      `INSERT INTO venda (id_cliente, id_usuario, forma_pagamento, total, data_hora)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [id_cliente || null, id_usuario, forma_pagamento, total]
    );
    const venda = vendaRes.rows[0];

    for (const item of itens) {
      const subtotal = Number(item.quantidade) * Number(item.preco_unitario);
      await client.query(
        `INSERT INTO item_venda (id_venda, id_produto, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venda.id_venda, item.id_produto, item.quantidade, item.preco_unitario, subtotal]
      );
    }

    if (forma_pagamento === 'FIADO' && id_cliente) {
      await client.query(
        'UPDATE cliente SET total_devido = total_devido + $1 WHERE id_cliente = $2',
        [total, id_cliente]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ok: true, venda });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /vendas]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao registrar venda: ' + err.message });
  } finally {
    client.release();
  }
});

/** GET /api/vendas */
router.get('/', async (req, res) => {
  const { de, ate, forma } = req.query;
  try {
    const result = await pool.query(
      `SELECT v.id_venda, v.data_hora, v.total, v.forma_pagamento,
              c.nome AS cliente, u.nome_exibicao AS funcionario
       FROM venda v
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
       WHERE ($1::date IS NULL OR v.data_hora::date >= $1::date)
         AND ($2::date IS NULL OR v.data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR v.forma_pagamento = $3)
       ORDER BY v.data_hora DESC LIMIT 200`,
      [de || null, ate || null, forma || null]
    );
    res.json({ ok: true, vendas: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao listar vendas: ' + err.message });
  }
});

module.exports = router;