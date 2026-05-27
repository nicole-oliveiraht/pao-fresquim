// src/database/connection.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // obrigatório no Supabase
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do banco:', err.message);
});

// Testa a conexão ao iniciar
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Conectado ao Supabase/PostgreSQL!');
}).catch(err => {
  console.error('❌ Falha na conexão com o banco:', err.message);
});

module.exports = pool;
