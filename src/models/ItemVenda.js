// Representa um produto dentro de uma venda (linha da venda)

class ItemVenda {
  #id;
  #produto;       // objeto Produto (associação com a classe Produto)
  #quantidade;
  #precoUnitario; 
  #subtotal;

  constructor(id, produto, quantidade) {
    this.#id            = id;
    this.#produto       = produto;             // recebe um objeto Produto
    this.#quantidade    = quantidade;
    this.#precoUnitario = produto.precoUnitario; 
    this.#subtotal      = this.calcularSubtotal();
  }

  get id()            { return this.#id; }
  get produto()       { return this.#produto; }
  get quantidade()    { return this.#quantidade; }
  get precoUnitario() { return this.#precoUnitario; }
  get subtotal()      { return this.#subtotal; }

  // Subtotal = quantidade × preço unitário
  calcularSubtotal() {
    this.#subtotal = this.#quantidade * this.#precoUnitario;
    return this.#subtotal;
  }
}

module.exports = ItemVenda;
