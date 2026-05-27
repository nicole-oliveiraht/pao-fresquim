// src/models/Usuario.js
// representa qualquer pessoa que faz login no sistema

class Usuario {
  #id;
  #nome;
  #login;
  #senhaHash;
  #perfil; // 'ADMINISTRADOR' ou 'ATENDENTE'

  
  constructor(id, nome, login, senhaHash, perfil) {
    this.#id        = id;
    this.#nome      = nome;
    this.#login     = login;
    this.#senhaHash = senhaHash;
    this.#perfil    = perfil;
  }

  get id()    { return this.#id; }
  get nome()  { return this.#nome; }
  get login() { return this.#login; }
  get perfil(){ return this.#perfil; }

 
  autenticar(senhaInformada) {
    // Retorna true se correta, false se incorreta
  }

  // Método: atualiza a senha
  trocarSenha(novaSenha) {
  
  }
}

module.exports = Usuario;
