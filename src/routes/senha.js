// src/routes/senha.js
const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');
const crypto  = require('crypto');

async function enviarEmail({ para, assunto, html }) {
  if (!process.env.EMAIL_HOST) {
    console.log(`[EMAIL SIMULADO] Para: ${para} | Assunto: ${assunto}`);
    return true;
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
  return true;
}

/** POST /api/senha/esqueci */
router.post('/esqueci', async (req, res) => {
  const { usuario } = req.body;
  if (!usuario) return res.status(400).json({ ok: false, erro: 'Informe o usuário.' });
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nome_exibicao, f.email
       FROM usuarios u
       LEFT JOIN funcionario f ON f.nome = u.nome_exibicao
       WHERE u.usuario = $1 AND u.ativo = true`,
      [usuario.toLowerCase().trim()]
    );
    if (!result.rows.length)
      return res.json({ ok: true, mensagem: 'Se o usuário existir, um e-mail será enviado.' });

    const user = result.rows[0];
    if (!user.email)
      return res.status(422).json({ ok: false, erro: 'Este usuário não tem e-mail cadastrado.' });

    const token  = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE usuarios SET reset_token=$1, reset_token_exp=$2 WHERE id_usuario=$3`,
      [token, expira, user.id_usuario]
    );

    const link = `${process.env.APP_URL || 'http://localhost:3000'}/?reset=${token}`;
    await enviarEmail({
      para: user.email,
      assunto: '🍞 Pão FresQUIM — Redefinição de Senha',
      html: `<p>Olá, <strong>${user.nome_exibicao}</strong>!</p>
             <p><a href="${link}">Clique aqui para redefinir sua senha</a> (expira em 1 hora).</p>`,
    });

    res.json({ ok: true, mensagem: 'E-mail enviado! Verifique sua caixa de entrada.' });
  } catch (err) {
    console.error('[POST /senha/esqueci]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao processar solicitação.' });
  }
});

/** POST /api/senha/redefinir */
router.post('/redefinir', async (req, res) => {
  const { token, nova_senha } = req.body;
  if (!token || !nova_senha)
    return res.status(400).json({ ok: false, erro: 'Token e nova senha são obrigatórios.' });
  if (nova_senha.length < 6)
    return res.status(400).json({ ok: false, erro: 'A senha deve ter pelo menos 6 caracteres.' });
  try {
    const result = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE reset_token=$1 AND reset_token_exp > NOW() AND ativo=true`,
      [token]
    );
    if (!result.rows.length)
      return res.status(400).json({ ok: false, erro: 'Link inválido ou expirado.' });

    const bcrypt = require('bcrypt');
    const hash   = await bcrypt.hash(nova_senha, 10);
    await pool.query(
      `UPDATE usuarios SET senha_hash=$1, reset_token=NULL, reset_token_exp=NULL WHERE id_usuario=$2`,
      [hash, result.rows[0].id_usuario]
    );
    res.json({ ok: true, mensagem: 'Senha redefinida com sucesso! Faça login.' });
  } catch (err) {
    console.error('[POST /senha/redefinir]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao redefinir senha.' });
  }
});

/** PUT /api/senha/admin/:id */
router.put('/admin/:id', async (req, res) => {
  const { nova_senha } = req.body;
  if (!nova_senha || nova_senha.length < 6)
    return res.status(400).json({ ok: false, erro: 'A senha deve ter pelo menos 6 caracteres.' });
  try {
    const bcrypt = require('bcrypt');
    const hash   = await bcrypt.hash(nova_senha, 10);
    const result = await pool.query(
      `UPDATE usuarios SET senha_hash=$1, reset_token=NULL, reset_token_exp=NULL
       WHERE id_usuario=$2 AND ativo=true RETURNING nome_exibicao`,
      [hash, req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });
    res.json({ ok: true, mensagem: `Senha de ${result.rows[0].nome_exibicao} redefinida com sucesso.` });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao redefinir senha.' });
  }
});

/** GET /api/senha/usuarios */
router.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_usuario, nome_exibicao, usuario, perfil, ativo, criado_em
       FROM usuarios WHERE ativo = true ORDER BY nome_exibicao`
    );
    res.json({ ok: true, usuarios: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao listar usuários.' });
  }
});

module.exports = router;
/** POST /api/senha/criar — admin cria novo usuário */
router.post('/criar', async (req, res) => {
  const { nome_exibicao, usuario, senha, perfil } = req.body;
  if (!nome_exibicao || !usuario || !senha)
    return res.status(400).json({ ok: false, erro: 'Nome, usuário e senha são obrigatórios.' });
  if (senha.length < 6)
    return res.status(400).json({ ok: false, erro: 'Senha deve ter pelo menos 6 caracteres.' });
  if (!['ADMIN','ATENDENTE'].includes(perfil))
    return res.status(400).json({ ok: false, erro: 'Perfil inválido.' });
  try {
    const dup = await pool.query('SELECT id_usuario FROM usuarios WHERE usuario = $1', [usuario.toLowerCase().trim()]);
    if (dup.rows.length)
      return res.status(409).json({ ok: false, erro: 'Já existe um usuário com este login.' });
    const bcrypt = require('bcrypt');
    const hash   = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nome_exibicao, usuario, senha_hash, perfil, ativo)
       VALUES ($1, $2, $3, $4, true) RETURNING id_usuario, nome_exibicao, usuario, perfil`,
      [nome_exibicao.trim(), usuario.toLowerCase().trim(), hash, perfil]
    );
    res.status(201).json({ ok: true, usuario: result.rows[0] });
  } catch (err) {
    console.error('[POST /senha/criar]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao criar usuário.' });
  }
});

/** PUT /api/senha/propria — usuário muda a própria senha */
router.put('/propria', async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  const id_usuario = req.session?.usuario?.id;
  if (!id_usuario)
    return res.status(401).json({ ok: false, erro: 'Sessão expirada. Faça login novamente.' });
  if (!senha_atual || !nova_senha)
    return res.status(400).json({ ok: false, erro: 'Informe a senha atual e a nova senha.' });
  if (nova_senha.length < 6)
    return res.status(400).json({ ok: false, erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
  try {
    const result = await pool.query(
      'SELECT senha_hash FROM usuarios WHERE id_usuario = $1 AND ativo = true',
      [id_usuario]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });
    const bcrypt = require('bcrypt');
    const senhaOk = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
    if (!senhaOk)
      return res.status(401).json({ ok: false, erro: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(nova_senha, 10);
    await pool.query(
      'UPDATE usuarios SET senha_hash = $1 WHERE id_usuario = $2',
      [hash, id_usuario]
    );
    res.json({ ok: true, mensagem: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('[PUT /senha/propria]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao alterar senha.' });
  }
});

/** PUT /api/senha/usuario/:id — admin edita dados do usuário */
router.put('/usuario/:id', async (req, res) => {
  const { nome_exibicao, usuario, perfil } = req.body;
  try {
    const result = await pool.query(
      `UPDATE usuarios SET
         nome_exibicao = COALESCE($1, nome_exibicao),
         usuario       = COALESCE($2, usuario),
         perfil        = COALESCE($3, perfil)
       WHERE id_usuario = $4 AND ativo = true RETURNING id_usuario, nome_exibicao, usuario, perfil`,
      [nome_exibicao, usuario ? usuario.toLowerCase().trim() : null, perfil, req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });
    res.json({ ok: true, usuario: result.rows[0] });
  } catch (err) {
    console.error('[PUT /senha/usuario/:id]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao editar usuário.' });
  }
});

/** DELETE /api/senha/usuario/:id — admin exclui (desativa) usuário */
router.delete('/usuario/:id', async (req, res) => {
  try {
    // Não pode excluir a si mesmo
    if (String(req.session?.usuario?.id) === String(req.params.id))
      return res.status(400).json({ ok: false, erro: 'Você não pode excluir seu próprio usuário.' });
    const result = await pool.query(
      `UPDATE usuarios SET ativo = false WHERE id_usuario = $1 AND ativo = true RETURNING nome_exibicao`,
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });
    res.json({ ok: true, mensagem: `Usuário "${result.rows[0].nome_exibicao}" excluído.` });
  } catch (err) {
    res.status(500).json({ ok: false, erro: 'Erro ao excluir usuário.' });
  }
});

/** GET /api/senha/usuarios/:id — buscar usuário específico */
router.get('/usuarios/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_usuario, nome_exibicao, usuario, perfil, ativo FROM usuarios WHERE id_usuario = $1',
      [req.params.id]
    );
    if(!result.rows.length) return res.status(404).json({ok:false,erro:'Usuário não encontrado.'});
    res.json({ok:true, usuario:result.rows[0]});
  } catch(err) {
    res.status(500).json({ok:false,erro:'Erro ao buscar usuário.'});
  }
});

/** PUT /api/senha/usuarios/:id — editar usuário (admin) */
router.put('/usuarios/:id', async (req, res) => {
  const {nome_exibicao, usuario, perfil, ativo} = req.body;
  if(!nome_exibicao || !usuario)
    return res.status(400).json({ok:false,erro:'Nome e usuário são obrigatórios.'});
  if(!['ADMIN','ATENDENTE'].includes(perfil))
    return res.status(400).json({ok:false,erro:'Perfil inválido.'});
  try {
    // Verificar duplicidade de login (exceto o próprio)
    const dup = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE usuario=$1 AND id_usuario!=$2',
      [usuario.toLowerCase().trim(), req.params.id]
    );
    if(dup.rows.length) return res.status(409).json({ok:false,erro:'Este login já está em uso.'});
    const result = await pool.query(
      `UPDATE usuarios SET nome_exibicao=$1, usuario=$2, perfil=$3, ativo=$4
       WHERE id_usuario=$5 RETURNING id_usuario, nome_exibicao, usuario, perfil, ativo`,
      [nome_exibicao.trim(), usuario.toLowerCase().trim(), perfil, ativo!==false, req.params.id]
    );
    if(!result.rows.length) return res.status(404).json({ok:false,erro:'Usuário não encontrado.'});
    res.json({ok:true, usuario:result.rows[0]});
  } catch(err) {
    console.error('[PUT /senha/usuarios/:id]', err.message);
    res.status(500).json({ok:false,erro:'Erro ao atualizar usuário.'});
  }
});

/** DELETE /api/senha/usuarios/:id — desativar usuário (soft delete) */
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE usuarios SET ativo=false WHERE id_usuario=$1 AND perfil!=\'ADMIN\' RETURNING nome_exibicao',
      [req.params.id]
    );
    if(!result.rows.length)
      return res.status(404).json({ok:false,erro:'Usuário não encontrado ou não pode ser desativado.'});
    res.json({ok:true, mensagem:`Usuário ${result.rows[0].nome_exibicao} desativado.`});
  } catch(err) {
    res.status(500).json({ok:false,erro:'Erro ao desativar usuário.'});
  }
});

/** PUT /api/senha/minha — usuário altera a própria senha */
router.put('/minha', async (req, res) => {
  const {senha_atual, nova_senha} = req.body;
  if(!senha_atual || !nova_senha)
    return res.status(400).json({ok:false,erro:'Senha atual e nova senha são obrigatórias.'});
  if(nova_senha.length < 6)
    return res.status(400).json({ok:false,erro:'A nova senha deve ter pelo menos 6 caracteres.'});
  if(!req.session?.usuario?.id)
    return res.status(401).json({ok:false,erro:'Sessão expirada.'});
  try {
    const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id_usuario=$1 AND ativo=true', [req.session.usuario.id]);
    if(!result.rows.length) return res.status(404).json({ok:false,erro:'Usuário não encontrado.'});
    const bcrypt = require('bcrypt');
    const ok = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
    if(!ok) return res.status(401).json({ok:false,erro:'Senha atual incorreta.'});
    const hash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE usuarios SET senha_hash=$1 WHERE id_usuario=$2', [hash, req.session.usuario.id]);
    res.json({ok:true, mensagem:'Senha alterada com sucesso!'});
  } catch(err) {
    console.error('[PUT /senha/minha]', err.message);
    res.status(500).json({ok:false,erro:'Erro ao alterar senha.'});
  }
});
