import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, limit as qlimit, onSnapshot, getDocs,
  deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt, periodKeys } from '../../lib/util';
import { ITEM_MAP, normalizeRoom } from '../../lib/items';
import RoomScene from '../../three/RoomScene.jsx';
import { isActiveStudent } from '../../lib/studentState';
import { SPACE_TABS, spaceConfig, spaceGuestbookLabel, isSpaceUnlocked } from '../../lib/spaces';

export default function VisitPage() {
  const { klass, student } = useOutletContext();
  const [friends, setFriends] = useState(null);
  const [host, setHost] = useState(null);   // 방문 중인 친구
  const [space, setSpace] = useState('room');
  const [book, setBook] = useState([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [writeBusy, setWriteBusy] = useState(false);
  const today = periodKeys().d;
  const rewardState = student.guestbookRewards?.date === today ? student.guestbookRewards : null;
  const todayRewardCount = Math.max(0, Math.min(5, Number(rewardState?.count) || 0));
  const rewardedHostIds = Array.isArray(rewardState?.hostIds) ? rewardState.hostIds : [];

  // 친구 목록 (한 번만 읽어요)
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'classes', klass.id, 'students'));
      setFriends(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(isActiveStudent)
            .sort((a, b) => (b.roomLikes || []).length - (a.roomLikes || []).length)
      );
    })();
  }, [klass.id]);

  // 방문 중인 친구의 방명록
  useEffect(() => {
    if (!host) return;
    const q = query(
      collection(db, 'classes', klass.id, 'students', host.id, 'guestbook'),
      orderBy('at', 'desc'), qlimit(30)
    );
    return onSnapshot(q, (s) => setBook(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id, host?.id]);

  // 방문 중 친구 정보 실시간 갱신 (좋아요 수 등)
  useEffect(() => {
    if (!host) return;
    return onSnapshot(doc(db, 'classes', klass.id, 'students', host.id), (s) => {
      if (s.exists()) setHost({ id: s.id, ...s.data() });
    });
  }, [klass.id, host?.id]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const toggleLike = async () => {
    const liked = (host.roomLikes || []).includes(student.id);
    await updateDoc(doc(db, 'classes', klass.id, 'students', host.id), {
      roomLikes: liked ? arrayRemove(student.id) : arrayUnion(student.id),
    });
  };

  const write = async (e) => {
    e.preventDefault();
    if (writeBusy) return;
    if (host.id === student.id) return flash('친구 공간에서만 방명록 보상을 받을 수 있어요.');
    if (!isSpaceUnlocked(host, space)) return flash('친구가 아직 이 공간을 열지 않았어요.');
    if (todayRewardCount >= 5) return flash('오늘 방명록 보상 5회를 모두 받았어요.');
    if (rewardedHostIds.includes(host.id)) return flash('오늘은 이 친구에게 이미 방명록을 남겼어요. 다른 친구 공간을 방문해 주세요.');
    const t = text.trim();
    if (t.length < 2) return flash('한 마디만 더 써 주세요!');
    setWriteBusy(true);
    const visitorRef = doc(db, 'classes', klass.id, 'students', student.id);
    const hostRef = doc(db, 'classes', klass.id, 'students', host.id);
    const guestbookRef = doc(collection(db, 'classes', klass.id, 'students', host.id, 'guestbook'));
    try {
      let rewardResult = null;
      await runTransaction(db, async (tx) => {
        const visitorSnap = await tx.get(visitorRef);
        const hostSnap = await tx.get(hostRef);
        if (!visitorSnap.exists() || !hostSnap.exists() || !isActiveStudent(hostSnap.data())) {
          throw new Error('친구 정보를 찾을 수 없어요.');
        }
        if (!isSpaceUnlocked(hostSnap.data(), space)) throw new Error('친구가 아직 이 공간을 열지 않았어요.');
        const current = visitorSnap.data() || {};
        const saved = current.guestbookRewards && typeof current.guestbookRewards === 'object'
          ? current.guestbookRewards
          : {};
        const count = saved.date === today ? Math.max(0, Number(saved.count) || 0) : 0;
        const hostIds = saved.date === today && Array.isArray(saved.hostIds) ? saved.hostIds : [];
        if (count >= 5) throw new Error('오늘 방명록 보상 5회를 모두 받았어요.');
        if (hostIds.includes(host.id)) throw new Error('오늘은 이 친구에게 이미 방명록을 남겼어요.');
        const reward = count === 0 ? 2 : 1;
        const nextCount = count + 1;
        tx.update(visitorRef, {
          cash: (Number(current.cash) || 0) + reward,
          guestbookRewards: {
            date: today,
            count: nextCount,
            hostIds: [...hostIds, host.id],
            lastReward: reward,
            updatedAt: Date.now(),
          },
        });
        tx.set(guestbookRef, {
          fromId: student.id,
          fromName: student.name,
          avatar: student.avatar?.base || '🙂',
          text: t.slice(0, 200),
          reward,
          rewardDate: today,
          space,
          spaceLabel: spaceGuestbookLabel(space),
          at: Date.now(),
          createdAt: serverTimestamp(),
        });
        rewardResult = { reward, count: nextCount };
      });
      setText('');
      flash(`✍️ 방명록을 남겼어요! +${rewardResult.reward}${klass.currency} (오늘 ${rewardResult.count}/5회)`);
    } catch (error) {
      flash(error.message);
    } finally {
      setWriteBusy(false);
    }
  };

  const remove = (g) => {
    if (g.fromId !== student.id && host.id !== student.id) return;
    if (!confirm('이 글을 지울까요?')) return;
    deleteDoc(doc(db, 'classes', klass.id, 'students', host.id, 'guestbook', g.id));
  };

  /* ---------- 친구 목록 화면 ---------- */
  if (!host) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl text-pink-500">🏠 친구 방 놀러가기</h2>
          <p className="text-sm text-gray-400">친구가 꾸민 방·정원·교실·카페를 구경하고 방명록을 남겨 보세요!</p>
        </div>
        {!friends ? (
          <div className="text-center text-gray-400 py-10">친구들을 찾는 중...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {friends.map((f) => {
              const items = SPACE_TABS
                .reduce((a, entry) => a + Object.keys(f[entry.mapField] || {}).length, 0);
              const likes = (f.roomLikes || []).length;
              const me = f.id === student.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setHost(f); setSpace('room'); }}
                  className={`bg-white rounded-3xl shadow p-4 text-center hover:scale-[1.03] transition ${me ? 'ring-2 ring-pink-300' : ''}`}
                >
                  <div className="text-4xl mb-1">{f.avatar?.base || '🙂'}</div>
                  <div className="text-sm">{f.name}{me && ' (나)'}</div>
                  <div className="text-[11px] text-gray-400">아이템 {items}개</div>
                  <div className="text-[11px] text-rose-400">❤️ {likes}</div>
                </button>
              );
            })}
            {!friends.length && (
              <div className="col-span-full text-center text-gray-400 py-10">아직 친구가 없어요.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ---------- 친구 방 구경 화면 ---------- */
  const currentSpace = spaceConfig(space);
  const currentSpaceUnlocked = isSpaceUnlocked(host, space);
  const roomMap = normalizeRoom(host[currentSpace.mapField]);
  const skin = host.roomSkin || {};
  const companions = (host.walking || []).map((id) => ITEM_MAP[id]).filter(Boolean).slice(0, 8);
  const liked = (host.roomLikes || []).includes(student.id);
  const likes = (host.roomLikes || []).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setHost(null)} className="rounded-xl px-3 py-1.5 bg-white shadow text-sm">← 친구 목록</button>
        <h2 className="text-xl text-pink-500">{host.avatar?.base || '🙂'} {host.name}의 공간</h2>
        <button
          onClick={toggleLike}
          className={`ml-auto rounded-xl px-4 py-2 shadow transition ${liked ? 'bg-rose-500 text-white' : 'bg-white text-rose-500'}`}
        >
          {liked ? '❤️' : '🤍'} {likes}
        </button>
      </div>

      {msg && <div className="rounded-2xl px-4 py-3 bg-emerald-50 text-emerald-700">{msg}</div>}

      <div className="flex min-w-0 max-w-full flex-nowrap overflow-x-auto rounded-2xl bg-white shadow w-fit">
        {SPACE_TABS.map((entry) => {
          const unlocked = isSpaceUnlocked(host, entry.id);
          return (
            <button
              key={entry.id}
              onClick={() => unlocked && setSpace(entry.id)}
              disabled={!unlocked}
              title={!unlocked ? '친구가 아직 구매하지 않은 공간이에요.' : entry.visitLabel}
              className={`shrink-0 whitespace-nowrap px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-45 sm:px-2.5 ${space === entry.id ? 'bg-pink-500 text-white' : 'text-gray-500'}`}
            >
              {unlocked ? entry.icon : '🔒'} {entry.visitLabel}
            </button>
          );
        })}
      </div>

      {!currentSpaceUnlocked ? (
        <div className="bg-white rounded-3xl shadow p-10 text-center text-gray-400">
          이 친구는 아직 {currentSpace.label}을(를) 열지 않았어요.
        </div>
      ) : Object.keys(roomMap).length === 0 ? (
        <div className="bg-white rounded-3xl shadow p-10 text-center text-gray-400">
          이 공간은 아직 비어 있어요. 다른 공간을 구경해 보세요!
        </div>
      ) : (
        <RoomScene
          key={`${host.id}-${space}`}
          mode={space}
          avatar={host.avatar || {}}
          roomMap={roomMap}
          wallId={skin.wall}
          floorId={skin.floor}
          companions={companions}
          height="52vh"
        />
      )}

      {/* 방명록 */}
      <div className="bg-white rounded-3xl shadow p-5">
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <h3 className="text-xl">✍️ 방명록</h3>
          <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
            오늘 보상 {todayRewardCount}/5회
          </span>
        </div>
        <form onSubmit={write} className="flex gap-2 mb-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder={`${host.name}에게 한 마디 남기기...`}
            className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-pink-400 outline-none"
          />
          <button
            disabled={writeBusy || host.id === student.id || todayRewardCount >= 5 || rewardedHostIds.includes(host.id)}
            className="rounded-2xl px-5 bg-pink-500 hover:bg-pink-600 text-white shadow disabled:bg-gray-300"
          >
            {writeBusy ? '저장 중...' : '남기기'}
          </button>
        </form>
        <p className="mb-3 text-xs text-gray-400">
          오늘 첫 방명록은 +2{klass.currency}, 이후 다른 친구에게 남기는 방명록은 +1{klass.currency} · 하루 최대 5회
          {rewardedHostIds.includes(host.id) && ' · 오늘은 이미 이 친구에게 보상을 받았어요.'}
        </p>
        {!book.length ? (
          <p className="text-gray-400 text-center py-6">첫 방명록을 남겨 보세요! 🎉</p>
        ) : (
          book.map((g) => (
            <div key={g.id} className="flex items-start gap-2 py-2.5 border-b border-gray-100">
              <span className="text-xl">{g.avatar}</span>
              <div className="flex-1">
                <div className="text-sm text-gray-500">{g.fromName}</div>
                <div className="text-gray-700">
                  {g.spaceLabel && <span className="mr-1 text-xs font-bold text-pink-400">({g.spaceLabel})</span>}
                  {g.text}
                </div>
              </div>
              <span className="text-[11px] text-gray-300">
                {new Date(g.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
              </span>
              {(g.fromId === student.id || host.id === student.id) && (
                <button onClick={() => remove(g)} className="text-gray-300 hover:text-rose-500 text-xs">삭제</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
