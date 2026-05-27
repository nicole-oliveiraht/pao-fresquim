// src/models/Produto.js
class Produto {
  #id;
  #nome;
  #precoUnitario;
  #codigoBarras; // lido pela balança ou scanner
  #unidade;      // 'kg', 'unidade', 'gramas'

  constructor(id, nome, precoUnitario, codigoBarras, unidade) {
    this.#id            = id;
    this.#nome          = nome;
    this.#precoUnitario = precoUnitario;
    this.#codigoBarras  = codigoBarras;
    this.#unidade       = unidade;
  }

  get id()            { return this.#id; }
  get nome()          { return this.#nome; }
  get precoUnitario() { return this.#precoUnitario; }
  get codigoBarras()  { return this.#codigoBarras; }
  get unidade()       { return this.#unidade; }

  static buscarPorCodigoBarras(codigo) {
    // Retorna um objeto Produto ou null se não encontrar
  }
    // Buscar por nome 
    static buscarPorNome(nome) {
    // Retorna um objeto Produto ou null se não encontrar
  }
}

module.exports = Produto;
