// src/middlewares/autenticar.js
/**
 * Middleware de autenticação.
 * Bloqueia rotas de API que exigem sessão ativa.
 * Para rotas que exigem perfil ADMIN, use autenticar.admin().
 */

function autenticar(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, erro: 'Sessão expirada. Faça login novamente.' });
  }
  // Injeta o usuário no req para facilitar uso nas rotas
  req.usuario = req.session.usuario;
  next();
}

autenticar.admin = function (req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, erro: 'Sessão expirada. Faça login novamente.' });
  }
  if (req.session.usuario.perfil !== 'ADMIN') {
    return res.status(403).json({ ok: false, erro: 'Acesso restrito ao Administrador.' });
  }
  req.usuario = req.session.usuario;
  next();
};

module.exports = autenticar;
