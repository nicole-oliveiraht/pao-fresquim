// index.js — arquivo de testes
// Execute com:  node index.js

const pool = require('./src/database/connection');
const Produto   = require('./src/models/Produto');
const ItemVenda = require('./src/models/ItemVenda');
const Venda     = require('./src/models/Venda');

async function testarTudo() {
  console.log('\n========================================');
  console.log('  TESTE — PADARIA PÃO FRESQUIM');
  console.log('========================================\n');

  // ── TESTE 1: Conexão com o Supabase ──
  console.log('TESTE 1: Conexão com o banco de dados...');
  try {
    const res = await pool.query('SELECT NOW() AS agora');
    console.log('✅ Supabase conectado! Hora:', res.rows[0].agora);
  } catch (err) {
    console.error('❌ Erro na conexão:', err.message);
    console.log('Verifique o arquivo .env e tente novamente.');
    process.exit(1); // encerra se não conseguir conectar
  }

  // ── TESTE 2: Verificar as tabelas ──
  console.log('\nTESTE 2: Verificando as tabelas...');
  try {
    const res = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    if (res.rows.length === 10) {
      console.log('✅ 10 tabelas encontradas:');
      res.rows.forEach(t => console.log('   →', t.table_name));
    } else {
      console.log('⚠️  Esperado 10 tabelas, encontrado:', res.rows.length);
      console.log('Execute o schema.sql no Supabase (Parte 6).');
    }
  } catch (err) {
    console.error('❌ Erro ao verificar tabelas:', err.message);
  }

  // ── TESTE 3: Classes do Diagrama ──
  console.log('\nTESTE 3: Testando as classes...');
  try {
    // Criar um produto
    const pao = new Produto(1, 'Pão Francês', 12.00, '7891234560001', 'kg');
    console.log('✅ Produto criado:', pao.nome, '→ R$', pao.precoUnitario, '/', pao.unidade);

    // Criar um item de venda (500g = 0.5 kg)
    const item = new ItemVenda(1, pao, 0.5);
    console.log('✅ Item criado: quantidade', item.quantidade, pao.unidade,
                '→ subtotal R$', item.calcularSubtotal());

    // Criar uma venda
    const venda = new Venda(null);
    venda.adicionarItem(item);
    venda.confirmarPagamento('PIX');
    console.log('✅ Venda criada → total R$', venda.total);
    console.log('✅ Forma de pagamento:', venda.formaPagamento);

    console.log('\n✅✅✅ TODOS OS TESTES PASSARAM! ✅✅✅');
  } catch (err) {
    console.error('❌ Erro nas classes:', err.message);
  }

  await pool.end();
}

testarTudo();
