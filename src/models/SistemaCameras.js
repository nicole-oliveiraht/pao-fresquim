// src/models/SistemaCamera.js
class SistemaCamera {
  #idCamera;
  #local;
  #protocoloRtsp; // URL do stream, ex: 'rtsp://192.168.1.10/stream'

  constructor(idCamera, local, protocoloRtsp) {
    this.#idCamera      = idCamera;
    this.#local         = local;
    this.#protocoloRtsp = protocoloRtsp;
  }

  get idCamera()      { return this.#idCamera; }
  get local()         { return this.#local; }
  get protocoloRtsp() { return this.#protocoloRtsp; }

  // Exibe a imagem da câmera abrindo a URL do stream no navegador

  visualizarImagem() {
    // TODO: integração real com stream RTSP
    
    console.log(`Câmera [${this.#local}] — abrindo stream: ${this.#protocoloRtsp}`);
    return this.#protocoloRtsp;
  }
}

module.exports = SistemaCamera;