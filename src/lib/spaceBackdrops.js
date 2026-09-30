// 공간꾸미기 3D 장면 뒤에 까는 공간별 일러스트 배경입니다.
// 넓은 공간도 같은 기본 공간(baseId)의 배경을 쓰고, 색감만 RoomScene에서 살짝 덧칠해요.
import roomBackdrop from '../assets/space-backdrops/room.webp';
import gardenBackdrop from '../assets/space-backdrops/garden.webp';
import classroomBackdrop from '../assets/space-backdrops/classroom.webp';
import cafeBackdrop from '../assets/space-backdrops/cafe.webp';

const BACKDROPS = {
  room: roomBackdrop,
  garden: gardenBackdrop,
  classroom: classroomBackdrop,
  cafe: cafeBackdrop,
};

export function spaceBackdropFor(baseId) {
  return BACKDROPS[baseId] || BACKDROPS.room;
}

// 넓은 공간은 같은 그림 위에 보랏빛을 살짝 덧씌워 기본 공간과 구분해요.
export function spaceBackdropStyle(baseId, wide = false) {
  const image = `url(${spaceBackdropFor(baseId)})`;
  return {
    backgroundImage: wide
      ? `linear-gradient(180deg, rgba(139, 92, 246, .18), rgba(236, 72, 153, .1)), ${image}`
      : image,
  };
}
