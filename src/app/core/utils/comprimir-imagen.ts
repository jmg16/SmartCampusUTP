const LIMITE_BYTES = 900 * 1024;

export async function comprimirImagen(archivo: File): Promise<File> {
  if (archivo.size <= LIMITE_BYTES && /^image\/(jpeg|png|webp|gif)$/i.test(archivo.type)) {
    return archivo;
  }

  const imagen = await cargarImagen(archivo);
  let lado = 1600;
  let calidad = 0.82;
  let mejor: Blob | null = null;

  for (let intento = 0; intento < 6; intento += 1) {
    const blob = await dibujar(imagen, lado, calidad);
    if (!blob) break;
    mejor = blob;
    if (blob.size <= LIMITE_BYTES) break;
    calidad -= 0.12;
    lado = Math.round(lado * 0.8);
  }

  if (!mejor || mejor.size > LIMITE_BYTES) {
    throw new Error('La foto sigue siendo demasiado pesada.');
  }

  const nombre = archivo.name.replace(/\.[^.]+$/, '') || 'portada';
  return new File([mejor], `${nombre}.jpg`, { type: 'image/jpeg' });
}

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    imagen.src = url;
  });
}

function dibujar(imagen: HTMLImageElement, ladoMaximo: number, calidad: number): Promise<Blob | null> {
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const contexto = canvas.getContext('2d');
  if (!contexto) return Promise.resolve(null);
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', Math.max(0.4, calidad)));
}
