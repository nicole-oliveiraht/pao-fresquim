// src/routes/serasa.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

let _serasaToken    = null;
let _serasaTokenExp = 0;

async function obterTokenSerasa() {
  if (_serasaToken && Date.now() < _serasaTokenExp) return _serasaToken;
  const resp = await fetch(`${process.env.SERASA_URL}/security/iam/v1/client-identities/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: process.env.SERASA_CLIENT_ID, password: process.env.SERASA_CLIENT_SECRET }),
  });
  if (!resp.ok) throw new Error('Falha ao autenticar na API Serasa.');
  const data = await resp.json();
  _serasaToken    = data.token || data.access_token;
  _serasaTokenExp = Date.now() + (data.expires_in || 3600) * 1000 - 60000;
  return _serasaToken;
}

router.get('/:cpf', async (req, res) => {
  const cpf = req.params.cpf.replace(/\D/g, '');
  if (cpf.length !== 11)
    return res.status(400).json({ ok: false, erro: 'CPF inválido.' });

  if (process.env.SERASA_CLIENT_ID && process.env.SERASA_CLIENT_SECRET) {
    try {
      const token = await obterTokenSerasa();
      const resp  = await fetch(
        `${process.env.SERASA_URL}/insights-bureau/v1/persons/${cpf}/person-full-score`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      if (!resp.ok) throw new Error(`Serasa retornou status ${resp.status}`);
      const data      = await resp.json();
      const negativado = data.optionalFeatures?.negativeData?.pefin?.pefinResponse?.length > 0
                      || data.optionalFeatures?.negativeData?.refin?.refinResponse?.length > 0;
      const score      = data.score?.score ?? null;
      const ocorrencias = [
        ...(data.optionalFeatures?.negativeData?.pefin?.pefinResponse || []),
        ...(data.optionalFeatures?.negativeData?.refin?.refinResponse || []),
      ].map(o => ({ credor: o.creditorName || o.legalNature, valor: o.amount, data: o.occurrenceDate }));

      await pool.query(
        `UPDATE cliente SET status_serasa = $1 WHERE cpf = $2`,
        [negativado ? 'NEGATIVADO' : 'LIMPO', cpf]
      ).catch(() => {});

      return res.json({ ok: true, cpf, negativado, score, ocorrencias, fonte: 'serasa_real' });
    } catch (err) {
      return res.status(502).json({ ok: false, erro: `Erro ao consultar Serasa: ${err.message}` });
    }
  }

  // Modo simulado
  const ultimoDigito = parseInt(cpf[10]);
  const negativado   = ultimoDigito % 2 !== 0 && ultimoDigito > 5;
  const score        = negativado ? Math.floor(Math.random() * 300) + 100 : Math.floor(Math.random() * 400) + 500;

  return res.json({
    ok: true, cpf, negativado, score,
    ocorrencias: negativado ? [
      { credor: 'Banco Simulado S.A.', valor: 1250.00, data: '2025-08-15' },
      { credor: 'Loja Demo Ltda.',     valor: 340.00,  data: '2025-11-02' },
    ] : [],
    fonte: 'simulado',
    aviso: 'Consulta simulada. Configure SERASA_CLIENT_ID e SERASA_CLIENT_SECRET no .env para ativar a API real.',
  });
});

module.exports = router;