// Carrega fontes para gerar PDF.
import robotoUrl from '../assets/Roboto-Regular.ttf?url';

let fontPromise: Promise<string> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const loadPdfFont = () => {
  if (!fontPromise) {
    fontPromise = fetch(robotoUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Não foi possível carregar a fonte do PDF.');
        }
        return response.arrayBuffer();
      })
      .then((buffer) => arrayBufferToBase64(buffer));
  }
  return fontPromise;
};
