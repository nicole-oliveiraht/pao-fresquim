// src/models/Funcionario.js
const Usuario = require('./Usuario'); // importa a classe pai

class Funcionario extends Usuario { // 'extends' = herança
  #cpf;
  #cargo;
  #telefone;
  #endereco;
  #telefoneEmergencia;
  #dataAdmissao;
  #licencas;

  constructor(id, nome, login, senhaHash, perfil,
              cpf, cargo, telefone, endereco,
              telefoneEmergencia, dataAdmissao, licencas) {
    // chama o construtor da classe pai (Usuario)
   
    super(id, nome, login, senhaHash, perfil);

    this.#cpf                = cpf;
    this.#cargo              = cargo;
    this.#telefone           = telefone;
    this.#endereco           = endereco;
    this.#telefoneEmergencia = telefoneEmergencia;
    this.#dataAdmissao       = dataAdmissao;
    this.#licencas           = licencas;
  }

  get cpf()                { return this.#cpf; }
  get cargo()              { return this.#cargo; }
  get telefone()           { return this.#telefone; }
  get endereco()           { return this.#endereco; }
  get telefoneEmergencia() { return this.#telefoneEmergencia; }
  get dataAdmissao()       { return this.#dataAdmissao; }
  get licencas()           { return this.#licencas; }

  registrarPonto() {
    // TODO: INSERT INTO registro_ponto
  }

  anexarAtestado(arquivoPath, dataAtestado, observacoes) {
    // TODO: INSERT INTO atestado
  }
}

module.exports = Funcionario;
