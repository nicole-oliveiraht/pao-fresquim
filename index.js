// index.js  —  Servidor principal da Padaria Pão FresQUIM
require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessões (em produção use connect-pg-simple apontando pro Supabase)
app.use(session({
  secret: process.env.SESSION_SECRET || 'paofresquim-secret-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,   // 8 horas
  },
}));

// Arquivos estáticos (HTML, CSS, JS do front-end)
app.use(express.static(path.join(__dirname, 'public')));

// Servir uploads de atestados
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Rotas de API ───────────────────────────────────────────────────
app.use('/api/auth',         require('./src/routes/auth'));
app.use('/api/produtos',     require('./src/routes/produtos'));
app.use('/api/clientes',     require('./src/routes/clientes'));
app.use('/api/vendas',       require('./src/routes/vendas'));
app.use('/api/funcionarios', require('./src/routes/funcionarios'));
app.use('/api/relatorios',   require('./src/routes/relatorios'));
app.use('/api/ponto',        require('./src/routes/ponto'));
app.use('/api/notafiscal',   require('./src/routes/notaFiscal'));
app.use('/api/serasa',       require('./src/routes/serasa'));
app.use('/api/senha',        require('./src/routes/senha'));
app.use('/api/notificacoes', require('./src/routes/notificacoes'));

// ── SPA fallback: qualquer rota não-API serve o index.html ─────────
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ── Iniciar servidor ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍞  Pão FresQUIM rodando em http://localhost:${PORT}`);
  console.log(`🗄️  Banco: ${process.env.DB_HOST || '(não configurado)'}`);
  console.log(`🔒  Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});