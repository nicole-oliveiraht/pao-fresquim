// src/models/Venda.js

class Venda {
  #id;
  #dataHora;
  #itens;         
  #total;
  #formaPagamento; // 'DINHEIRO','DEBITO','CREDITO','PIX','FIADO'
  #numeroNotaFiscal;
  #funcionario;    
  #cliente;        //  só preenchido quando for FIADO

  constructor(funcionario) {
    this.#dataHora    = new Date(); 
    this.#itens       = [];         
    this.#total       = 0;
    this.#funcionario = funcionario;
    this.#cliente     = null;      
  }

  get id()             { return this.#id; }
  get total()          { return this.#total; }
  get itens()          { return this.#itens; }
  get dataHora()       { return this.#dataHora; }
  get formaPagamento() { return this.#formaPagamento; }

  adicionarItem(itemVenda) {
    this.#itens.push(itemVenda);
    this.calcularTotal();
  }
  
  calcularTotal() {
    this.#total = this.#itens.reduce(
      (soma, item) => soma + item.subtotal,
      0 
    );
    return this.#total;
  }
 
  confirmarPagamento(forma, cliente = null) {
  
    this.#formaPagamento = forma;
    if (forma === 'FIADO') {
      if (!cliente) {
        throw new Error('Venda no fiado exige cliente cadastrado!');
      }
      this.#cliente = cliente;
    }
  }

  registrar() {
    // TODO: INSERT INTO venda (data_hora, total, forma_pagamento,
    //        id_usuario, id_cliente, nr_nota_fiscal)
  }

  emitirNotaFiscal() {
    // TODO: chamar serviço externo de NF-e (SEFAZ)
  }
}

module.exports = Venda;
