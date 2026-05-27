// src/routes/relatorios.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/** GET /api/relatorios/vendas */
router.get('/vendas', async (req, res) => {
  const { de, ate, forma, produto } = req.query;
  try {
    const resumo = await pool.query(
      `SELECT COUNT(*) AS total_vendas,
              COALESCE(SUM(total), 0) AS receita_total,
              COALESCE(SUM(CASE WHEN forma_pagamento='FIADO' THEN total ELSE 0 END), 0) AS total_fiado
       FROM venda
       WHERE ($1::date IS NULL OR data_hora::date >= $1::date)
         AND ($2::date IS NULL OR data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR forma_pagamento = $3)`,
      [de || null, ate || null, forma || null]
    );

    const porDia = await pool.query(
      `SELECT data_hora::date AS dia, COUNT(*) AS qtd_vendas, SUM(total) AS receita
       FROM venda
       WHERE ($1::date IS NULL OR data_hora::date >= $1::date)
         AND ($2::date IS NULL OR data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR forma_pagamento = $3)
       GROUP BY dia ORDER BY dia ASC`,
      [de || null, ate || null, forma || null]
    );

    const porProduto = await pool.query(
      `SELECT p.nome, SUM(iv.quantidade) AS qtd_vendida, SUM(iv.subtotal) AS receita
       FROM item_venda iv
       JOIN produto p ON p.id_produto = iv.id_produto
       JOIN venda v ON v.id_venda = iv.id_venda
       WHERE ($1::date IS NULL OR v.data_hora::date >= $1::date)
         AND ($2::date IS NULL OR v.data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR p.nome ILIKE '%' || $3 || '%')
       GROUP BY p.nome ORDER BY receita DESC`,
      [de || null, ate || null, produto || null]
    );

    const porMes = await pool.query(
      `SELECT DATE_TRUNC('month', data_hora)::date AS mes,
              COUNT(*) AS qtd_vendas,
              COALESCE(SUM(total), 0) AS receita
       FROM venda
       WHERE ($1::date IS NULL OR data_hora::date >= $1::date)
         AND ($2::date IS NULL OR data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR forma_pagamento = $3)
       GROUP BY mes ORDER BY mes ASC`,
      [de || null, ate || null, forma || null]
    );

    res.json({ ok: true, resumo: resumo.rows[0], porDia: porDia.rows, porProduto: porProduto.rows, porMes: porMes.rows });
  } catch (err) {
    console.error('[GET /relatorios/vendas]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar relatório.' });
  }
});

/** GET /api/relatorios/devedores */
router.get('/devedores', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id_cliente, c.nome, c.telefone, c.email, c.total_devido, CAST(c.total_devido AS FLOAT) AS saldo_devedor, c.status_serasa, CASE WHEN c.status_serasa = 'NEGATIVADO' THEN true ELSE false END AS negativado_serasa,
              COUNT(v.id_venda) AS qtd_compras,
              MAX(v.data_hora) AS ultima_compra,
              COUNT(n.id_notificacao) AS notificacoes_enviadas
       FROM cliente c
       JOIN venda v ON v.id_cliente = c.id_cliente AND v.forma_pagamento = 'FIADO'
       LEFT JOIN notificacao n ON n.id_cliente = c.id_cliente
       WHERE c.total_devido > 0
       GROUP BY c.id_cliente ORDER BY c.total_devido DESC`
    );
    res.json({ ok: true, devedores: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar devedores.' });
  }
});

module.exports = router;
/** GET /api/relatorios/funcionarios */
router.get('/funcionarios', async (req, res) => {
  const { de, ate, forma } = req.query;
  try {
    const porFuncionario = await pool.query(
      `SELECT u.nome_exibicao AS funcionario,
              COUNT(v.id_venda) AS qtd_vendas,
              COALESCE(SUM(v.total), 0) AS receita
       FROM venda v
       JOIN usuarios u ON u.id_usuario = v.id_usuario
       WHERE ($1::date IS NULL OR v.data_hora::date >= $1::date)
         AND ($2::date IS NULL OR v.data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR v.forma_pagamento = upper($3))
       GROUP BY u.nome_exibicao
       ORDER BY receita DESC`,
      [de || null, ate || null, forma || null]
    );

    const ultimasVendas = await pool.query(
      `SELECT v.id_venda, v.data_hora, v.total, v.forma_pagamento,
              c.nome AS cliente, u.nome_exibicao AS funcionario
       FROM venda v
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
       WHERE ($1::date IS NULL OR v.data_hora::date >= $1::date)
         AND ($2::date IS NULL OR v.data_hora::date <= $2::date)
         AND ($3 = '' OR $3 IS NULL OR v.forma_pagamento = upper($3))
       ORDER BY v.data_hora DESC LIMIT 300`,
      [de || null, ate || null, forma || null]
    );

    res.json({ ok: true, porFuncionario: porFuncionario.rows, ultimasVendas: ultimasVendas.rows });
  } catch (err) {
    console.error('[GET /relatorios/funcionarios]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar relatório de funcionários.' });
  }
});

/** GET /api/relatorios/pagamentos-fiado */
router.get('/pagamentos-fiado', async (req, res) => {
  const { de, ate } = req.query;
  try {
    const result = await pool.query(
      `SELECT pf.id_pagamento, pf.data_pagamento, pf.valor, pf.observacoes,
              c.nome AS cliente_nome
       FROM pagamento_fiado pf
       JOIN cliente c ON c.id_cliente = pf.id_cliente
       WHERE ($1::date IS NULL OR pf.data_pagamento >= $1::date)
         AND ($2::date IS NULL OR pf.data_pagamento <= $2::date)
       ORDER BY pf.data_pagamento DESC`,
      [de || null, ate || null]
    );
    const total_recebido = result.rows.reduce((sum, r) => sum + Number(r.valor), 0);
    res.json({ ok: true, pagamentos: result.rows, total_recebido });
  } catch (err) {
    console.error('[GET /relatorios/pagamentos-fiado]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar pagamentos de fiado.' });
  }
});
