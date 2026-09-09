import assert from 'node:assert/strict';
import test from 'node:test';
import { fit, HERO_ART_ANCHORS, HERO_ARM_OCCLUSION } from './heroArtAnchors.js';

test('landmark translation scales with the 2:3 image plane, not the square card', () => {
  const from = [197, 721], to = [282, 710];
  const style = fit(from, to, .91, .91, 15);
  const [tx, ty] = style.transform.match(/translate\(([^,]+)%, ([^)]+)%\)/).slice(1).map(Number);
  for (const height of [180, 320, 520]) {
    const width = height * 2 / 3;
    assert.ok(Math.abs((from[0] / 1024 + tx / 100) * width - to[0] / 1024 * width) < 1e-8);
    assert.ok(Math.abs((from[1] / 1536 + ty / 100) * height - to[1] / 1536 * height) < 1e-8);
  }
});

test('opposite-facing armor reflects around its own neck landmark', () => {
  const style = HERO_ART_ANCHORS.hero_female.armor.elite[0];
  assert.equal(style.transformOrigin, `${560 / 1024 * 100}% ${295 / 1536 * 100}%`);
  assert.match(style.transform, /scale\(-0.79, 0.79\)/);
});

test('paired calibrated gloves and shoes have independent left/right masks', () => {
  for (const gender of Object.values(HERO_ART_ANCHORS)) {
    for (const slot of ['gloves', 'shoes']) {
      for (const pieces of Object.values(gender[slot] || {})) {
        assert.equal(pieces.length, 2);
        assert.equal(pieces[0].clipPath, 'inset(0 50% 0 0)');
        assert.equal(pieces[1].clipPath, 'inset(0 0 0 50%)');
        assert.notEqual(pieces[0].transform, pieces[1].transform);
      }
    }
  }
});

test('calibration is keyed only by gender, slot and equipped rarity', () => {
  assert.notEqual(HERO_ART_ANCHORS.hero_female.armor.common, HERO_ART_ANCHORS.hero_female.armor.elite);
  assert.equal(HERO_ART_ANCHORS.hero_male.weapon.common, undefined);
  assert.equal(HERO_ARM_OCCLUSION.hero_male.common, undefined);
  assert.equal(HERO_ARM_OCCLUSION.hero_male.legendary.length, 2);
  for (const gender of Object.values(HERO_ART_ANCHORS)) {
    for (const slot of Object.values(gender)) {
      for (const pieces of Object.values(slot)) {
        for (const piece of pieces) assert.doesNotMatch(piece.transform, /NaN|Infinity/);
      }
    }
  }
});
