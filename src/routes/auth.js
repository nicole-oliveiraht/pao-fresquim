const express = require('express');
const router  = require('express').Router();
const pool    = require('../database/connection');
const bcrypt  = require('bcrypt');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  if (!usuario || !senha)
    return res.status(400).json({ ok: false, erro: 'Usuário e senha são obrigatórios.' });

  try {
    const result = await pool.query(
      `SELECT id_usuario, nome_exibicao, usuario, senha_hash, perfil, ativo
       FROM usuarios
       WHERE usuario = $1 AND ativo = true`,
      [usuario.toLowerCase().trim()]
    );

    if (!result.rows.length)
      return res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos.' });

    const user = result.rows[0];

    const senhaOk = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaOk)
      return res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos.' });

    req.session.usuario = {
      id:     user.id_usuario,
      nome:   user.nome_exibicao,
      perfil: user.perfil,   // 'ADMIN' ou 'ATENDENTE'
      cargo:  'Funcionário',
    };

    return res.json({ ok: true, usuario: req.session.usuario });

  } catch (err) {
    console.error('[POST /auth/login]', err.message);
    return res.status(500).json({ ok: false, erro: 'Erro interno ao fazer login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session?.usuario)
    return res.json({ ok: true, usuario: req.session.usuario });
  return res.status(401).json({ ok: false });
});

module.exports = router;