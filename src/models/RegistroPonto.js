// src/models/RegistroPonto.js
class RegistroPonto {
  #id;
  #idFuncionario;
  #data;
  #entrada;
  #saida;

  constructor(id, idFuncionario, data, entrada, saida = null) {
    this.#id            = id;
    this.#idFuncionario = idFuncionario;
    this.#data          = data;
    this.#entrada       = entrada;
    this.#saida         = saida;
  }

  get id()            { return this.#id; }
  get idFuncionario() { return this.#idFuncionario; }
  get data()          { return this.#data; }
  get entrada()       { return this.#entrada; }
  get saida()         { return this.#saida; }

  registrar() {
    // TODO: INSERT INTO registro_ponto
    // (id_funcionario, data, entrada) VALUES (?, NOW(), NOW())
  }
}
module.exports = RegistroPonto;
