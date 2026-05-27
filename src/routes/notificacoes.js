// src/routes/notificacoes.js — RF21/RF22/RF23/RF24
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

/* ── Helpers de envio ─────────────────────────────────── */

async function enviarWhatsApp(telefone, mensagem) {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    console.log(`[WhatsApp SIMULADO] Para: ${telefone} | Msg: ${mensagem}`);
    return { ok: true, simulado: true };
  }
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  const to = telefone.replace(/\D/g, '');
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to:   `whatsapp:+55${to}`,
    body: mensagem,
  });
  return { ok: true };
}

async function enviarSMS(telefone, mensagem) {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN || !process.env.TWILIO_SMS_FROM) {
    console.log(`[SMS SIMULADO] Para: ${telefone} | Msg: ${mensagem}`);
    return { ok: true, simulado: true };
  }
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  const to = telefone.replace(/\D/g, '');
  await client.messages.create({
    from: process.env.TWILIO_SMS_FROM,
    to:   `+55${to}`,
    body: mensagem,
  });
  return { ok: true };
}

async function enviarEmail(para, assunto, html) {
  if (!process.env.EMAIL_HOST) {
    console.log(`[Email SIMULADO] Para: ${para} | Assunto: ${assunto}`);
    return { ok: true, simulado: true };
  }
  const nodemailer  = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: para, subject: assunto, html,
  });
  return { ok: true };
}

/* ── Rotas ────────────────────────────────────────────── */

/**
 * POST /api/notificacoes/enviar
 * Body: { id_cliente, canal: 'WHATSAPP'|'SMS'|'EMAIL', mensagem? }
 */
router.post('/enviar', async (req, res) => {
  const { id_cliente, canal, mensagem } = req.body;

  if (!id_cliente || !canal)
    return res.status(400).json({ ok: false, erro: 'id_cliente e canal são obrigatórios.' });
  if (!['WHATSAPP','SMS','EMAIL'].includes(canal))
    return res.status(400).json({ ok: false, erro: 'Canal inválido.' });

  try {
    // Buscar dados do cliente
    const cliRes = await pool.query(
      'SELECT nome, telefone, email, total_devido, status_serasa FROM cliente WHERE id_cliente = $1',
      [id_cliente]
    );
    if (!cliRes.rows.length)
      return res.status(404).json({ ok: false, erro: 'Cliente não encontrado.' });

    const cli = cliRes.rows[0];
    const totalFmt = `R$ ${Number(cli.total_devido).toFixed(2).replace('.', ',')}`;
    const avisoSerasa = cli.status_serasa === 'NEGATIVADO'
      ? ' ⚠️ Seu CPF consta como NEGATIVADO no Serasa.' : '';

    const msgFinal = mensagem ||
      `Olá, ${cli.nome}! A Padaria Pão FresQUIM informa que você possui um saldo pendente de ${totalFmt}.${avisoSerasa} Para regularizar, entre em contato pelo (34) 99999-9999. Obrigado! 🍞`;

    let resultado = { ok: false };
    let status    = 'FALHOU';

    if (canal === 'WHATSAPP' && cli.telefone) {
      resultado = await enviarWhatsApp(cli.telefone, msgFinal);
    } else if (canal === 'SMS' && cli.telefone) {
      resultado = await enviarSMS(cli.telefone, msgFinal);
    } else if (canal === 'EMAIL' && cli.email) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#8B5A1A;padding:20px;text-align:center;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">🍞 Padaria Pão FresQUIM</h2>
          </div>
          <div style="padding:24px;border:1px solid #E8D5B5;border-top:none;border-radius:0 0 8px 8px">
            <p>Olá, <strong>${cli.nome}</strong>!</p>
            <p>Você possui um saldo pendente de <strong style="color:#C94A2A">${totalFmt}</strong> com a nossa padaria.</p>
            ${cli.status_serasa === 'NEGATIVADO' ? '<p style="color:#C94A2A">⚠️ Seu CPF consta como negativado no Serasa. Entre em contato para regularizar.</p>' : ''}
            <p>Para quitar ou saber mais, entre em contato pelo <strong>(34) 99999-9999</strong>.</p>
            <p style="margin-top:24px;color:#9B7A5A;font-size:13px">Obrigado pela preferência! 🍞</p>
          </div>
        </div>`;
      resultado = await enviarEmail(cli.email, `🍞 Aviso de Saldo Pendente — Padaria Pão FresQUIM`, html);
    } else {
      return res.status(422).json({ ok: false, erro: `Cliente não possui ${canal === 'EMAIL' ? 'e-mail' : 'telefone'} cadastrado.` });
    }

    if (resultado.ok) status = 'ENVIADA';

    // Registrar notificação no banco
    await pool.query(
      `INSERT INTO notificacao (id_cliente, canal, mensagem, status)
       VALUES ($1,$2,$3,$4)`,
      [id_cliente, canal, msgFinal, status]
    );

    res.json({
      ok: resultado.ok,
      simulado: resultado.simulado || false,
      canal,
      status,
      mensagem: msgFinal,
    });

  } catch (err) {
    console.error('[POST /notificacoes/enviar]', err.message);
    // Registrar falha
    await pool.query(
      `INSERT INTO notificacao (id_cliente, canal, mensagem, status)
       VALUES ($1,$2,$3,'FALHOU')`,
      [id_cliente, canal, mensagem || 'Aviso de saldo pendente']
    ).catch(() => {});
    res.status(500).json({ ok: false, erro: 'Erro ao enviar notificação: ' + err.message });
  }
});

/**
 * GET /api/notificacoes/:id_cliente
 * Histórico de notificações do cliente
 */
router.get('/:id_cliente', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_notificacao, canal, mensagem, status, data_envio
       FROM notificacao
       WHERE id_cliente = $1
       ORDER BY data_envio DESC`,
      [req.params.id_cliente]
    );
    res.json({ ok: true, notificacoes: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao buscar notificações.' });
  }
});

module.exports = router;
