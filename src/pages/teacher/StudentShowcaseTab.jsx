import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { isActiveStudent } from '../../lib/studentState';
import { ITEM_MAP, normalizeRoom } from '../../lib/items';
import { SPACE_TABS, isSpaceUnlocked, spaceConfig } from '../../lib/spaces';
import { HERO_ITEM_MAP, HERO_SLOTS, heroBattlePower, heroDisplayName, normalizeHero } from '../../lib/hero';
import RoomScene from '../../three/RoomScene.jsx';
import HeroCardVisual from '../../components/HeroCardVisual.jsx';
import { HeroItemVisual } from '../../components/HeroItemVisual.jsx';

const placedCountFor = (student, spaceId) => {
  const config = spaceConfig(spaceId);
  if (!student || !isSpaceUnlocked(student, spaceId)) return 0;
  return Object.keys(normalizeRoom(student[config.mapField])).length;
};

const unlockedSpaceCountFor = (student) => SPACE_TABS.filter((entry) => isSpaceUnlocked(student, entry.id)).length;

const roomMetricFor = (student, spaceId) => {
  const config = spaceConfig(spaceId);
  if (!isSpaceUnlocked(student, spaceId)) {
    return { icon: '🔒', label: '미개방', detail: `${config.visitLabel} 잠김`, locked: true };
  }
  const placed = placedCountFor(student, spaceId);
  return {
    icon: '🏠',
    label: placed ? `${placed}개 배치` : '비어 있음',
    detail: `${config.visitLabel} · ${unlockedSpaceCountFor(student)}/8 공간 열림`,
  };
};

const heroMetricFor = (student) => {
  const hero = normalizeHero(student?.rpg);
  return hero.character
    ? { icon: '⚔️', label: `${hero.clearedLevel}단계`, detail: `전투력 ${fmt(heroBattlePower(hero))}` }
    : { icon: '⚔️', label: '미시작', detail: '아직 용사를 시작하지 않았어요.', locked: true };
};

export default function StudentShowcaseTab({ klass }) {
  const [students, setStudents] = useState(null);
  const [view, setView] = useState('room');
  const [selectedId, setSelectedId] = useState('');
  const [space, setSpace] = useState('room');

  useEffect(() => onSnapshot(collection(db, 'classes', klass.id, 'students'), (snap) => {
    setStudents(snap.docs.map((item) => ({ id: item.id, ...item.data() })).filter(isActiveStudent));
  }), [klass.id]);

  const orderedStudents = useMemo(() => [...(students || [])].sort((a, b) => (
    String(a.name || '').localeCompare(String(b.name || ''), 'ko', { numeric: true })
  )), [students]);

  useEffect(() => {
    if (!selectedId && orderedStudents[0]) setSelectedId(orderedStudents[0].id);
    if (selectedId && !orderedStudents.some((student) => student.id === selectedId)) {
      setSelectedId(orderedStudents[0]?.id || '');
    }
  }, [orderedStudents, selectedId]);

  const selected = orderedStudents.find((student) => student.id === selectedId) || null;
  const hero = selected ? normalizeHero(selected.rpg) : null;
  const currentSpace = spaceConfig(space);
  const spaceUnlocked = selected ? isSpaceUnlocked(selected, space) : false;
  const roomMap = selected && spaceUnlocked ? normalizeRoom(selected[currentSpace.mapField]) : {};
  const companions = selected
    ? (Array.isArray(selected.walking) ? selected.walking : []).map((id) => ITEM_MAP[id]).filter(Boolean).slice(0, 8)
    : [];
  const roomItemCount = Object.keys(roomMap).length;
  const unlockedSpaceCount = selected ? unlockedSpaceCountFor(selected) : 0;

  const selectStudent = (studentId) => {
    setSelectedId(studentId);
    setSpace('room');
  };

  return (
    <div className="space-y-4">
      <div className="teacher-showcase-header rounded-3xl p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="teacher-showcase-kicker">CLASS SHOWCASE</div>
            <h2 className="text-2xl font-bold">🏠 학생 공간 · ⚔️ 용사 구경</h2>
            <p className="mt-1 text-sm text-white/70">학생을 선택하면 꾸민 공간과 장착한 용사의 모습을 선생님 화면에서 볼 수 있어요.</p>
          </div>
          <div className="ml-auto flex rounded-2xl bg-black/15 p-1">
            <button type="button" onClick={() => setView('room')} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${view === 'room' ? 'bg-white text-pink-600 shadow' : 'text-white/70 hover:bg-white/10'}`}>🏠 집 놀러가기</button>
            <button type="button" onClick={() => setView('hero')} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${view === 'hero' ? 'bg-white text-indigo-600 shadow' : 'text-white/70 hover:bg-white/10'}`}>⚔️ 용사 구경</button>
          </div>
        </div>
      </div>

      {!students ? (
        <div className="rounded-3xl bg-white p-10 text-center text-gray-400 shadow">학생 목록을 불러오는 중...</div>
      ) : !orderedStudents.length ? (
        <div className="rounded-3xl bg-white p-10 text-center text-gray-400 shadow">아직 활동 중인 학생이 없어요.</div>
      ) : (
        <>
          <section className="rounded-3xl bg-white p-4 shadow">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-700">학생 선택</h3>
              <span className="text-xs text-gray-400">{orderedStudents.length}명</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {orderedStudents.map((item) => {
                const metric = view === 'room' ? roomMetricFor(item, space) : heroMetricFor(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectStudent(item.id)}
                    className={`rounded-2xl border-2 px-2 py-2 text-left transition hover:-translate-y-0.5 ${selected?.id === item.id ? 'border-indigo-400 bg-indigo-50 shadow' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.avatar?.base || '🙂'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-700">{item.name}</span>
                        <span className={`showcase-student-metric ${metric.locked ? 'showcase-student-metric-muted' : view === 'room' ? 'showcase-student-metric-room' : 'showcase-student-metric-hero'}`} title={metric.detail}>
                          <span aria-hidden="true">{metric.icon}</span> {metric.label}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selected && view === 'room' && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-pink-600">{selected.avatar?.base || '🙂'} {selected.name}의 {currentSpace.label}</h3>
                <span className="text-xs text-gray-400">선생님 관람 모드 · 편집 불가</span>
              </div>
              <div className="showcase-space-summary">
                <div className="showcase-space-summary-main">
                  <span className="showcase-space-summary-kicker">SPACE VISIT</span>
                  <strong>{currentSpace.icon} {currentSpace.label}</strong>
                  <p>{spaceUnlocked ? `${selected.name}이 꾸민 ${currentSpace.visitLabel}의 현재 모습이에요.` : '아직 잠금 해제하지 않은 공간이에요.'}</p>
                </div>
                <div className="showcase-space-stat-grid">
                  <div className="showcase-space-stat">
                    <span>배치 오브젝트</span>
                    <b>{spaceUnlocked ? roomItemCount : '—'}</b>
                    <small>{spaceUnlocked ? '현재 공간' : '미개방'}</small>
                  </div>
                  <div className="showcase-space-stat">
                    <span>열린 공간</span>
                    <b>{unlockedSpaceCount}<em>/8</em></b>
                    <small>전체 공간</small>
                  </div>
                  <div className="showcase-space-stat">
                    <span>함께 있는 친구</span>
                    <b>{companions.length}</b>
                    <small>동행 캐릭터</small>
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 max-w-full flex-nowrap overflow-x-auto rounded-2xl bg-white shadow">
                {SPACE_TABS.map((entry) => {
                  const unlocked = isSpaceUnlocked(selected, entry.id);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => unlocked && setSpace(entry.id)}
                      disabled={!unlocked}
                      className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${space === entry.id ? 'bg-pink-500 text-white' : 'text-gray-500 hover:bg-pink-50'}`}
                    >
                      {unlocked ? entry.icon : '🔒'} {entry.visitLabel}
                    </button>
                  );
                })}
              </div>
              {!spaceUnlocked ? (
                <div className="rounded-3xl bg-white p-10 text-center text-gray-400 shadow">아직 열리지 않은 공간이에요.</div>
              ) : Object.keys(roomMap).length === 0 ? (
                <div className="rounded-3xl bg-white p-10 text-center text-gray-400 shadow">이 공간은 아직 비어 있어요.</div>
              ) : (
                <RoomScene
                  key={`${selected.id}-${space}`}
                  mode={space}
                  avatar={selected.avatar || {}}
                  roomMap={roomMap}
                  wallId={selected.roomSkin?.wall}
                  floorId={selected.roomSkin?.floor}
                  companions={companions}
                  height="52vh"
                />
              )}
            </section>
          )}

          {selected && view === 'hero' && (
            <section className="teacher-hero-showcase rounded-3xl p-5 shadow-xl">
              <div className="teacher-hero-showcase-head">
                <div>
                  <div className="teacher-hero-showcase-kicker">HERO GALLERY</div>
                  <h3 className="mt-1 text-2xl font-black">{selected.name}의 용사 프로필</h3>
                  <p className="mt-1 text-sm text-indigo-100/75">장착한 장비는 캐릭터를 가리지 않는 슬롯 배지로 확인할 수 있어요.</p>
                </div>
                <div className="teacher-hero-stage-pill">
                  <span>STAGE</span>
                  <b>{hero?.character ? String(hero.clearedLevel).padStart(2, '0') : '—'}</b>
                </div>
              </div>
              <div className="grid items-center gap-5 md:grid-cols-[270px_minmax(0,1fr)]">
                <div className="hero-showcase-portrait flex justify-center">
                  {hero?.character ? <HeroCardVisual hero={hero} size={245} animated className="hero-showcase-card" /> : <div className="flex h-[245px] w-[245px] items-center justify-center rounded-3xl bg-white/10 text-6xl">❔</div>}
                  {hero?.character && <div className="hero-showcase-portrait-note">장비 {Object.values(hero.equipment || {}).filter(Boolean).length}개 장착</div>}
                </div>
                <div className="text-white">
                  <div className="text-xs font-bold tracking-[0.2em] text-cyan-200">HERO PROFILE</div>
                  <h3 className="mt-1 text-3xl font-black">{hero?.character ? heroDisplayName(hero) : `${selected.name}의 용사`}</h3>
                  <div className="mt-2 text-sm text-indigo-100">학생 {selected.name} · {hero?.character ? HERO_ITEM_MAP[hero.character]?.name : '아직 캐릭터를 구매하지 않았어요.'}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-xl bg-white/15 px-3 py-2 text-sm">정복 단계 <b>{hero?.clearedLevel || 0} / 100</b></span>
                    <span className="rounded-xl bg-white/15 px-3 py-2 text-sm">전투력 <b>{fmt(hero?.character ? heroBattlePower(hero) : 0)}</b></span>
                  </div>
                  {hero?.character && (
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {HERO_SLOTS.map(([slot, label]) => {
                        const item = HERO_ITEM_MAP[hero.equipment[slot]];
                        return (
                          <div key={slot} className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/15 bg-black/15 p-2">
                            <HeroItemVisual item={item} size={48} showLevel={false} />
                            <div className="min-w-0">
                              <div className="text-[10px] text-indigo-200">{label}</div>
                              <div className="truncate text-xs font-bold">{item?.name || '미장착'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

