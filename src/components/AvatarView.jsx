import { ITEM_MAP } from '../lib/items';

// 이모지를 레이어로 겹쳐 그리는 아바타 뷰
export default function AvatarView({ avatar = {}, size = 96 }) {
  const emoji = (id) => (id && ITEM_MAP[id] ? ITEM_MAP[id].emoji : null);
  const hat = emoji(avatar.hat);
  const face = emoji(avatar.face);
  const acc = emoji(avatar.acc);
  return (
    <div className="relative select-none" style={{ width: size, height: size * 1.25 }}>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: 0, fontSize: size * 0.85, lineHeight: 1 }}
      >
        {avatar.base || '🐰'}
      </div>
      {hat && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -size * 0.05, fontSize: size * 0.4, lineHeight: 1 }}
        >
          {hat}
        </div>
      )}
      {face && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: size * 0.42, fontSize: size * 0.3, lineHeight: 1 }}
        >
          {face}
        </div>
      )}
      {acc && (
        <div
          className="absolute"
          style={{ right: -size * 0.2, bottom: 0, fontSize: size * 0.4, lineHeight: 1 }}
        >
          {acc}
        </div>
      )}
    </div>
  );
}
