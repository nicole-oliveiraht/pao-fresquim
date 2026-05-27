// src/routes/clientes.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/** GET /api/clientes */
router.get('/', async (req, res) => {
  const { busca = '' } = req.query;
  try {
    const result = await pool.query(
      `SELECT id_cliente, nome, cpf, telefone, email, endereco,
              status_serasa, total_devido,
              total_devido AS saldo_devedor,
              CASE WHEN status_serasa = 'NEGATIVADO' THEN true ELSE false END AS negativado_serasa,
              criado_em
       FROM cliente
       WHERE ($1 = '' OR nome ILIKE $2 OR cpf ILIKE $2 OR telefone ILIKE $2)
       ORDER BY nome ASC`,
      [busca, `%${busca}%`]
    );
    res.json({ ok: true, clientes: result.rows });
  } catch (err) {
    console.error('[GET /clientes]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar clientes.' });
  }
});

/** GET /api/clientes/:id */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ ok: false, erro: 'Cliente não encontrado.' });
    res.json({ ok: true, cliente: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar cliente.' });
  }
});

/** POST /api/clientes */
router.post('/', async (req, res) => {
  const { nome, cpf, telefone, email, endereco } = req.body;
  if (!nome || !cpf) return res.status(400).json({ ok: false, erro: 'Nome e CPF são obrigatórios.' });
  try {
    const dup = await pool.query('SELECT id_cliente FROM cliente WHERE cpf = $1', [cpf.replace(/\D/g,'')]);
    if (dup.rows.length) return res.status(409).json({ ok: false, erro: 'Já existe um cliente com este CPF.' });
    const result = await pool.query(
      `INSERT INTO cliente (nome, cpf, telefone, email, endereco)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome.trim(), cpf.replace(/\D/g,''), telefone || null, email || null, endereco || null]
    );
    res.status(201).json({ ok: true, cliente: result.rows[0] });
  } catch (err) {
    console.error('[POST /clientes]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao cadastrar cliente.' });
  }
});

/** PUT /api/clientes/:id */
router.put('/:id', async (req, res) => {
  const { nome, telefone, email, endereco, negativado_serasa, status_serasa } = req.body;
  try {
    // Aceita tanto status_serasa direto quanto negativado_serasa (legado)
    let statusSerasa = status_serasa || undefined;
    if (!statusSerasa && negativado_serasa !== undefined) {
      statusSerasa = negativado_serasa ? 'NEGATIVADO' : 'LIMPO';
    }
    const result = await pool.query(
      `UPDATE cliente SET
         nome          = COALESCE($1, nome),
         telefone      = COALESCE($2, telefone),
         email         = COALESCE($3, email),
         endereco      = COALESCE($4, endereco),
         status_serasa = COALESCE($5, status_serasa)
       WHERE id_cliente = $6 RETURNING *`,
      [nome, telefone, email, endereco, statusSerasa, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, erro: 'Cliente não encontrado.' });
    res.json({ ok: true, cliente: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao atualizar cliente.' });
  }
});

/** POST /api/clientes/:id/pagar — quitar dívida (total ou parcial) */
router.post('/:id/pagar', async (req, res) => {
  const { valor, data_pagamento } = req.body;
  if (!valor || Number(valor) <= 0)
    return res.status(400).json({ ok: false, erro: 'Informe um valor válido.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cliRes = await client.query(
      'SELECT id_cliente, nome, total_devido FROM cliente WHERE id_cliente = $1',
      [req.params.id]
    );
    if (!cliRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, erro: 'Cliente não encontrado.' });
    }
    const cli          = cliRes.rows[0];
    const novoSaldo    = Math.max(0, Number(cli.total_devido) - Number(valor));
    const dataPagamento = data_pagamento || new Date().toISOString().split('T')[0];

    await client.query(
      `UPDATE cliente SET total_devido = $1 WHERE id_cliente = $2`,
      [novoSaldo, req.params.id]
    );

    // Registrar o pagamento como notificação de histórico
    await client.query(
      `INSERT INTO notificacao (id_cliente, canal, mensagem, status)
       VALUES ($1, 'EMAIL', $2, 'ENVIADA')`,
      [req.params.id, `Pagamento de R$ ${Number(valor).toFixed(2)} registrado em ${dataPagamento}. Saldo anterior: R$ ${Number(cli.total_devido).toFixed(2)}. Novo saldo: R$ ${novoSaldo.toFixed(2)}.`]
    );

    await client.query('COMMIT');
    res.json({
      ok: true,
      saldo_anterior: Number(cli.total_devido),
      valor_pago: Number(valor),
      novo_saldo: novoSaldo,
      data_pagamento: dataPagamento,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /clientes/:id/pagar]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao registrar pagamento.' });
  } finally {
    client.release();
  }
});

/** GET /api/clientes/:id/fiado */
router.get('/:id/fiado', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id_venda, v.data_hora, v.total, v.forma_pagamento,
              json_agg(json_build_object('produto', p.nome, 'qtd', iv.quantidade, 'preco', iv.preco_unitario)) AS itens
       FROM venda v
       JOIN item_venda iv ON iv.id_venda = v.id_venda
       JOIN produto p ON p.id_produto = iv.id_produto
       WHERE v.id_cliente = $1 AND v.forma_pagamento = 'FIADO'
       GROUP BY v.id_venda ORDER BY v.data_hora DESC`,
      [req.params.id]
    );
    res.json({ ok: true, fiado: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar fiado.' });
  }
});

module.exports = router;

/** POST /api/clientes/:id/pagamento — registrar pagamento de fiado */
router.post('/:id/pagamento', async (req, res) => {
  const { valor, data_pagamento, observacoes } = req.body;
  if(!valor || valor <= 0)
    return res.status(400).json({ok:false,erro:'Valor inválido.'});
  if(!data_pagamento)
    return res.status(400).json({ok:false,erro:'Data do pagamento é obrigatória.'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Reduzir saldo devedor (mínimo 0)
    const result = await client.query(
      `UPDATE cliente
       SET total_devido = GREATEST(0, total_devido - $1)
       WHERE id_cliente = $2
       RETURNING id_cliente, nome, total_devido`,
      [valor, req.params.id]
    );
    if(!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ok:false,erro:'Cliente não encontrado.'});
    }
    // Registrar no histórico de pagamentos de fiado
    await client.query(
      `INSERT INTO pagamento_fiado (id_cliente, valor, data_pagamento, observacoes)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, valor, data_pagamento, observacoes || null]
    ).catch(()=>{});
    // Registrar notificação de pagamento
    await client.query(
      `INSERT INTO notificacao (id_cliente, canal, mensagem, status)
       VALUES ($1, 'EMAIL', $2, 'ENVIADA')`,
      [req.params.id, `Pagamento de R$ ${Number(valor).toFixed(2)} registrado em ${data_pagamento}. ${observacoes||''}`]
    ).catch(()=>{});
    await client.query('COMMIT');
    res.json({ok:true, total_devido: result.rows[0].total_devido, cliente: result.rows[0].nome});
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('[POST /clientes/:id/pagamento]', err.message);
    res.status(500).json({ok:false,erro:'Erro ao registrar pagamento.'});
  } finally {
    client.release();
  }
});
