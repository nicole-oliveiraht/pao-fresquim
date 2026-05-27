// src/models/Atestado.js
class Atestado {
  #id;
  #idFuncionario;
  #dataAtestado;
  #arquivoPath;  // caminho do arquivo salvo no servidor
  #observacoes;

  constructor(id, idFuncionario, dataAtestado, arquivoPath, observacoes = '') {
    this.#id            = id;
    this.#idFuncionario = idFuncionario;
    this.#dataAtestado  = dataAtestado;
    this.#arquivoPath   = arquivoPath;
    this.#observacoes   = observacoes;
  }

  get id()            { return this.#id; }
  get idFuncionario() { return this.#idFuncionario; }
  get dataAtestado()  { return this.#dataAtestado; }
  get arquivoPath()   { return this.#arquivoPath; }
  get observacoes()   { return this.#observacoes; }

  salvar() {
    // TODO: INSERT INTO atestado
  }
}
module.exports = Atestado;
