import { PROFILE_ITEM_MAP } from '../lib/profile';

// 프로필은 한 장의 동물·이모티콘 이미지만 보여 줍니다.
// 예전 데이터가 profile item id를 저장한 경우에도 맵을 통해 그대로 표시합니다.
export default function AvatarView({ avatar = {}, size = 96 }) {
  const base = PROFILE_ITEM_MAP[avatar.base]?.value || avatar.base || '🐰';
  return (
    <div className="relative select-none" style={{ width: size, height: size * 1.25 }}>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: 0, fontSize: size * 0.85, lineHeight: 1 }}
      >
        {base}
      </div>
    </div>
  );
}
