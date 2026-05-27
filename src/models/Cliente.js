// src/models/Cliente.js
class Cliente {
  #id;
  #nome;
  #cpf;
  #telefone;
  #email;
  #statusSerasa; // 'LIMPO' ou 'NEGATIVADO'
  #totalDevido;  // valor total em aberto no fiado

  constructor(id, nome, cpf, telefone, email,
              statusSerasa = 'LIMPO', totalDevido = 0.00) {
    this.#id           = id;
    this.#nome         = nome;
    this.#cpf          = cpf;
    this.#telefone     = telefone;
    this.#email        = email;
    this.#statusSerasa = statusSerasa;
    this.#totalDevido  = totalDevido;
  }

  get id()           { return this.#id; }
  get nome()         { return this.#nome; }
  get cpf()          { return this.#cpf; }
  get telefone()     { return this.#telefone; }
  get email()        { return this.#email; }
  get statusSerasa() { return this.#statusSerasa; }
  get totalDevido()  { return this.#totalDevido; }

  consultarSerasa() {
    // Retorna true se CPF limpo, false se negativado
  }

  notificar(canal) {
    // Criar objeto Notificacao e chamar enviar()
  }

  calcularTotalDevido() {
    // TODO: SELECT SUM(total) FROM venda
    return this.#totalDevido;
  }
}

module.exports = Cliente;
