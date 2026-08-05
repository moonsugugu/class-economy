const BURSTS = [
  { x: 16, y: 24, hue: 45, delay: 0 },
  { x: 50, y: 15, hue: 190, delay: 180 },
  { x: 83, y: 27, hue: 320, delay: 340 },
  { x: 31, y: 62, hue: 125, delay: 500 },
  { x: 70, y: 64, hue: 265, delay: 650 },
];
const ANGLES = Array.from({ length: 16 }, (_, index) => index * 22.5);

export default function VictoryFireworks({ active = false }) {
  if (!active) return null;
  return (
    <div className="victory-fireworks" aria-live="polite" aria-label="승리 폭죽">
      {BURSTS.map((burst, burstIndex) => (
        <div
          key={`${burst.x}-${burst.y}`}
          className="firework-burst"
          style={{
            '--firework-x': `${burst.x}%`,
            '--firework-y': `${burst.y}%`,
            '--firework-hue': burst.hue,
            animationDelay: `${burst.delay}ms`,
          }}
        >
          <span className="firework-core" />
          {ANGLES.map((angle, sparkIndex) => (
            <span
              key={`${burstIndex}-${angle}`}
              className="firework-spark"
              style={{
                '--firework-angle': `${angle}deg`,
                '--firework-distance': `${62 + ((sparkIndex + burstIndex) % 4) * 15}px`,
                animationDelay: `${burst.delay + sparkIndex * 28}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
