// All landmarks are measured in the original 1024 × 1536 image, not the
// surrounding square card. Keep left/right pieces independently adjustable.
const half = (side) => side === 'left' ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)';
const outline = (points) => `polygon(${points.map(([x, y]) => `${x / 1024 * 100}% ${y / 1536 * 100}%`).join(', ')})`;
export const fit = (from, to, sx = 1, sy = sx, angle = 0, side) => ({
  transformOrigin: `${from[0] / 1024 * 100}% ${from[1] / 1536 * 100}%`,
  transform: `translate(${(to[0] - from[0]) / 1024 * 100}%, ${(to[1] - from[1]) / 1536 * 100}%) rotate(${angle}deg) scale(${sx}, ${sy})`,
  ...(side ? { clipPath: half(side) } : {}),
});

export const HERO_ART_ANCHORS = {
  hero_female: {
    armor: {
      // Elite faces the opposite way from the base pose. Reflect around its
      // neck, then attach that neck to the base; never around the card center.
      elite: [fit([560, 295], [566, 292], -.79, .79)],
      common: [fit([525, 365], [560, 300], .83, .84)],
    },
    helmet: { transcendent: [fit([545, 160], [562, 110], .63)] },
    shoes: {
      rare: [fit([460, 1360], [452, 1343], 1.02, 1, 0, 'left'), fit([600, 1300], [595, 1267], 1.04, 1, 0, 'right')],
      elite: [fit([290, 1340], [440, 1330], .7, .75, 0, 'left'), fit([780, 1330], [592, 1270], -.7, .65, -20, 'right')],
    },
    weapon: {
      // The common asset is a sheathed sword with a belt, worn at the hip.
      common: [fit([557, 875], [524, 600], .62, .62, -9)],
      legendary: [fit([265, 655], [291, 643])],
    },
    gloves: {
      legendary: [fit([250, 715], [300, 656], .72, .72, -25, 'left'), fit([775, 865], [762, 752], .75, .75, 10, 'right')],
      transcendent: [fit([220, 595], [295, 650], .76, .76, -23, 'left'), fit([804, 768], [765, 745], .75, .75, 9, 'right')],
    },
  },
  hero_male: {
    armor: { rare: [fit([565, 360], [577, 267], .95, .95)] },
    gloves: {
      common: [fit([182, 928], [282, 712], .75, .75, 9, 'left'), fit([853, 930], [805, 724], .75, .75, -3, 'right')],
      elite: [fit([265, 710], [282, 712], .92, .92, 2, 'left'), fit([840, 727], [805, 724], .92, .92, -3, 'right')],
    },
    shoes: {
      legendary: [fit([284, 1350], [326, 1368], 1.06, .97, 0, 'left'), fit([727, 1318], [725, 1340], 1.1, .94, 0, 'right')],
    },
    weapon: { transcendent: [fit([197, 721], [282, 710], .91)] },
  },
};

// Reveal the original upper arms in front of the cape, with shoulders still
// behind the pauldrons. Gloves remain in front of both arms and weapon grips.
export const HERO_ARM_OCCLUSION = {
  hero_male: {
    legendary: [
      'polygon(38% 25%, 46% 27%, 38% 38%, 32% 49%, 23% 49%, 30% 34%)',
      'polygon(67% 27%, 71% 27%, 77% 35%, 84% 50%, 75% 50%, 68% 35%)',
    ],
  },
  hero_female: {
    elite: [
      'polygon(44% 29%, 47% 29%, 45% 34%, 33% 42%, 27% 46%, 24% 42%, 35% 35%)',
      outline([[645, 368], [696, 365], [708, 425], [726, 510], [751, 662], [780, 719], [797, 798], [774, 783], [759, 749], [752, 776], [731, 733], [725, 676], [701, 566], [671, 451]]),
    ],
  },
};
