// src/models/Notificacao.js
class Notificacao {
  #id;
  #idCliente;
  #dataEnvio;
  #canal;     // 'WHATSAPP', 'EMAIL' ou 'SMS'
  #mensagem;
  #status;    // 'PENDENTE', 'ENVIADA' ou 'FALHOU'

  constructor(id, idCliente, canal, mensagem) {
    this.#id        = id;
    this.#idCliente = idCliente;
    this.#dataEnvio = new Date();
    this.#canal     = canal;
    this.#mensagem  = mensagem;
    this.#status    = 'PENDENTE';
  }

  get id()        { return this.#id; }
  get idCliente() { return this.#idCliente; }
  get dataEnvio() { return this.#dataEnvio; }
  get canal()     { return this.#canal; }
  get mensagem()  { return this.#mensagem; }
  get status()    { return this.#status; }

  enviar() {
    // TODO: UPDATE this.#status para 'ENVIADA' ou 'FALHOU'
    // TODO: INSERT INTO notificacao (id_cliente, canal, mensagem, status)
  }
}
module.exports = Notificacao;
