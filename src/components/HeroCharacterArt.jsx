import { useEffect, useState } from 'react';

const processedArtCache = new Map();

const isLightNeutral = (data, offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const brightness = (red + green + blue) / 3;
  return brightness > 188 && Math.max(red, green, blue) - Math.min(red, green, blue) < 30;
};

function removeConnectedLightBackground(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(source);
          return;
        }

        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        const pixelCount = canvas.width * canvas.height;
        let alreadyTransparent = false;
        for (let pixel = 0; pixel < pixelCount; pixel += 1) {
          if (data[pixel * 4 + 3] < 250) {
            alreadyTransparent = true;
            break;
          }
        }
        if (alreadyTransparent) {
          resolve(source);
          return;
        }

        // 배경과 닿아 있는 밝은 무채색 영역만 flood-fill합니다. 캐릭터 안쪽의
        // 흰 장식과 의상은 외곽과 연결되어 있지 않아 보존됩니다.
        const removed = new Uint8Array(pixelCount);
        const stack = new Int32Array(pixelCount);
        let stackSize = 0;
        const push = (x, y) => {
          if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
          const pixel = y * canvas.width + x;
          if (removed[pixel] || !isLightNeutral(data, pixel * 4)) return;
          removed[pixel] = 1;
          stack[stackSize] = pixel;
          stackSize += 1;
        };

        for (let x = 0; x < canvas.width; x += 1) {
          push(x, 0);
          push(x, canvas.height - 1);
        }
        for (let y = 1; y < canvas.height - 1; y += 1) {
          push(0, y);
          push(canvas.width - 1, y);
        }

        while (stackSize > 0) {
          stackSize -= 1;
          const pixel = stack[stackSize];
          const x = pixel % canvas.width;
          const y = Math.floor(pixel / canvas.width);
          // 생성 이미지가 체크무늬를 RGB로 구워 넣는 경우가 있어요. 대각선으로
          // 맞닿은 타일도 배경으로 이어 보아야 바둑판이 남지 않습니다.
          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
              if (offsetX || offsetY) push(x + offsetX, y + offsetY);
            }
          }
        }

        let changed = false;
        for (let pixel = 0; pixel < pixelCount; pixel += 1) {
          if (!removed[pixel]) continue;
          data[pixel * 4 + 3] = 0;
          changed = true;
        }
        if (!changed) {
          resolve(source);
          return;
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        // 캔버스 접근이 제한된 환경에서는 원본을 그대로 보여줍니다.
        resolve(source);
      }
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}

export default function HeroCharacterArt({ src, alt = '', className = '' }) {
  const [processedSrc, setProcessedSrc] = useState(() => processedArtCache.get(src) || null);

  useEffect(() => {
    let cancelled = false;
    if (!src) return undefined;
    if (processedArtCache.has(src)) {
      setProcessedSrc(processedArtCache.get(src));
      return undefined;
    }

    removeConnectedLightBackground(src).then((result) => {
      processedArtCache.set(src, result);
      if (!cancelled) setProcessedSrc(result);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) return null;
  return (
    <img
      className={`${className} ${processedSrc ? '' : 'hero-character-art-processing'}`.trim()}
      src={processedSrc || src}
      alt={alt}
    />
  );
}
