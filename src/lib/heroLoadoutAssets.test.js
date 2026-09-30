// 장비 레이어 에셋 점검: 60장이 모두 있고, 기본 캐릭터와 같은 2:3 화면 크기인지 확인합니다.
// 레이어는 위치 보정 없이 기본 캐릭터와 같은 상자에 겹치기만 하므로, 화면 크기나 비율이
// 하나라도 다르면 장비가 몸에서 어긋납니다. 에셋을 교체할 때마다 이 테스트로 막습니다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ASSETS = new URL('../assets/', import.meta.url);
const GENDERS = ['male', 'female'];
const SLOTS = ['helmet', 'armor', 'weapon', 'gloves', 'shoes', 'accessory'];
const RARITIES = ['common', 'rare', 'elite', 'legendary', 'transcendent'];
const LAYER_SIZE = { width: 768, height: 1152 };

// 확장 WebP(VP8X) 헤더에서 캔버스 크기와 알파 여부를 읽습니다.
function webpInfo(buffer, name) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${name}: RIFF 헤더가 아니에요`);
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', `${name}: WebP가 아니에요`);
  assert.equal(buffer.toString('ascii', 12, 16), 'VP8X', `${name}: 투명 배경이 있는 확장 WebP여야 해요`);
  return {
    alpha: Boolean(buffer[20] & 0x10),
    width: 1 + buffer.readUIntLE(24, 3),
    height: 1 + buffer.readUIntLE(27, 3),
  };
}

async function infoOf(relativePath) {
  return webpInfo(await readFile(new URL(relativePath, ASSETS)), relativePath);
}

test('기본 캐릭터는 투명 배경의 2:3 이미지예요', async () => {
  for (const gender of GENDERS) {
    const info = await infoOf(`hero-guardian-${gender}-base-cutout.webp`);
    assert.ok(info.alpha, `${gender} 기본 캐릭터에 알파가 없어요`);
    assert.equal(info.width * 3, info.height * 2, `${gender} 기본 캐릭터 비율이 2:3이 아니에요`);
  }
});

test('성별·부위·등급별 장비 레이어 60장이 모두 같은 화면 크기예요', async () => {
  let count = 0;
  for (const gender of GENDERS) {
    for (const slot of SLOTS) {
      for (const rarity of RARITIES) {
        const path = `hero-loadout/${gender}/${slot}/${rarity}.webp`;
        const info = await infoOf(path);
        assert.ok(info.alpha, `${path}: 알파가 없어요`);
        assert.deepEqual({ width: info.width, height: info.height }, LAYER_SIZE, `${path}: 화면 크기가 달라요`);
        count += 1;
      }
    }
  }
  assert.equal(count, 60);
});
