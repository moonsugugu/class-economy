import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  HERO_DUEL_LIMIT, HERO_DUEL_WIN_REWARD, heroBattleChance, heroDateKey,
  heroDuelExtraCost, heroDuelWinReward, heroDisplayName, heroBattlePower, normalizeHero, HERO_ITEM_MAP,
} from '../../lib/hero';
import { isActiveStudent } from '../../lib/studentState';
import { HeroItemVisual } from '../../components/HeroItemVisual.jsx';
import HeroDuelArena from '../../components/HeroDuelArena.jsx';
import VictoryFireworks from '../../components/VictoryFireworks.jsx';

const sortByPower = (a, b) => b.power - a.power || String(a.name || '').localeCompare(String(b.name || ''), 'ko');

export default function HeroDuelPage() {
  const { klass, student } = useOutletContext();
  const [students, setStudents] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [battlePhase, setBattlePhase] = useState('idle');
  const [duelResult, setDuelResult] = useState(null);
  const [fireworks, setFireworks] = useState(false);
  const today = heroDateKey();
  const myHero = normalizeHero(student.rpg);
  const myPower = heroBattlePower(myHero);
  const duelState = student.heroDuel || {};
  const attempts = duelState.date === today ? Math.max(0, Number(duelState.count) || 0) : 0;
  const extraCost = heroDuelExtraCost(attempts);

  useEffect(() => (
    onSnapshot(collection(db, 'classes', klass.id, 'students'), (snap) => {
      setStudents(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    })
  ), [klass.id]);

  const ranked = useMemo(() => (students || [])
    .filter(isActiveStudent)
    .map((item) => {
      const hero = normalizeHero(item.rpg);
      return { ...item, hero, power: heroBattlePower(hero) };
    })
    .filter((item) => item.hero.character), [students]);

  const ordered = useMemo(() => [...ranked].sort(sortByPower), [ranked]);
  const myIndex = ordered.findIndex((item) => item.id === student.id);
  const above = myIndex >= 0 ? ordered.slice(Math.max(0, myIndex - 2), myIndex) : [];
  const below = myIndex >= 0 ? ordered.slice(myIndex + 1, myIndex + 3) : [];
  const candidates = [...above, ...below].map((item) => ({
    ...item,
    rankDelta: ordered.findIndex((candidate) => candidate.id === item.id) - myIndex,
  }));
  const selected = candidates.find((item) => item.id === selectedId) || null;
  const chance = selected ? heroBattleChance(myPower, selected.power, myHero) : 0;
  const selectedReward = selected ? heroDuelWinReward(selected.rankDelta) : HERO_DUEL_WIN_REWARD;

  useEffect(() => {
    if (selectedId && !selected) setSelectedId('');
  }, [selected, selectedId]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const challenge = async () => {
    if (busy || !selected) return;
    const needsExtraAttempt = attempts >= HERO_DUEL_LIMIT;
    if (needsExtraAttempt && !window.confirm(
      `오늘 친구 대결 기본 ${HERO_DUEL_LIMIT}회를 모두 사용했어요.\n` +
      `추가 대결 1회에 ${extraCost}${klass.currency}를 지불하고 도전할까요?`
    )) return;
    setBusy(true);
    setDuelResult(null);
    setBattlePhase('charge');
    const roll = Math.random();
    const ownRef = doc(db, 'classes', klass.id, 'students', student.id);
    const opponentRef = doc(db, 'classes', klass.id, 'students', selected.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 320));
      setBattlePhase('attack');
      await new Promise((resolve) => setTimeout(resolve, 560));
      let result = null;
      await runTransaction(db, async (tx) => {
        const ownSnap = await tx.get(ownRef);
        const opponentSnap = await tx.get(opponentRef);
        const own = ownSnap.data();
        const opponent = opponentSnap.data();
        if (!opponentSnap.exists() || !isActiveStudent(opponent)) throw new Error('상대 친구 정보를 찾을 수 없어요.');

        const currentHero = normalizeHero(own.rpg);
        const opponentHero = normalizeHero(opponent.rpg);
        if (!currentHero.character || !opponentHero.character) throw new Error('두 학생 모두 용사를 먼저 구매해야 해요.');
        const currentDuel = own.heroDuel && typeof own.heroDuel === 'object' ? own.heroDuel : {};
        const currentAttempts = currentDuel.date === today ? Math.max(0, Number(currentDuel.count) || 0) : 0;
        const currentExtraCost = heroDuelExtraCost(currentAttempts);
        if (currentAttempts >= HERO_DUEL_LIMIT && !needsExtraAttempt) {
          throw new Error('기본 대결 횟수가 방금 소진됐어요. 추가 대결 버튼을 다시 눌러 주세요.');
        }
        const cash = Number(own.cash) || 0;
        if (cash < currentExtraCost) throw new Error(`추가 대결에는 ${currentExtraCost}${klass.currency}가 필요해요.`);

        const currentPower = heroBattlePower(currentHero);
        const opponentPower = heroBattlePower(opponentHero);
        const winChance = heroBattleChance(currentPower, opponentPower, currentHero);
        const won = roll < winChance;
        const reward = won ? heroDuelWinReward(selected.rankDelta) : 0;
        const update = {
          heroDuel: {
            ...currentDuel,
            date: today,
            count: currentAttempts + 1,
            last: {
              opponentId: opponentSnap.id,
              opponentName: heroDisplayName(opponentHero),
              opponentPower,
              myPower: currentPower,
              won,
              chance: winChance,
              reward,
              rankDelta: selected.rankDelta,
              extraCost: currentExtraCost,
              at: Date.now(),
            },
          },
        };
        if (currentExtraCost > 0 || reward > 0) {
          update.cash = Math.round((cash - currentExtraCost + reward) * 100) / 100;
        }
        tx.update(ownRef, update);
        result = {
          won,
          opponentName: heroDisplayName(opponentHero),
          opponentPower,
          myPower: currentPower,
          chance: winChance,
          reward,
          rankDelta: selected.rankDelta,
          extraCost: currentExtraCost,
          attempt: currentAttempts + 1,
        };
      });

      flash(
        result.won ? 'ok' : 'err',
        result.won
          ? `🏆 ${result.opponentName}에게 승리했어요! ${result.reward}${klass.currency}를 받았어요.${result.extraCost ? ` 추가 비용 ${result.extraCost}${klass.currency}를 냈어요.` : ''} (${result.attempt}회)`
          : `💥 ${result.opponentName}에게 졌어요. 보상은 0${klass.currency}예요.${result.extraCost ? ` 추가 비용 ${result.extraCost}${klass.currency}를 냈어요.` : ''} (${result.attempt}회)`,
      );
      setDuelResult(result);
      setBattlePhase(result.won ? 'win' : 'lose');
      if (result.won) {
        setFireworks(true);
        setTimeout(() => setFireworks(false), 3000);
      }
      setTimeout(() => setBattlePhase('idle'), 1800);
    } catch (e) {
      flash('err', e.message);
      setBattlePhase('idle');
    } finally {
      setBusy(false);
    }
  };

  const opponentCard = (item, relation) => {
    const selectedNow = item.id === selectedId;
    return (
      <button
        key={item.id}
        onClick={() => setSelectedId(item.id)}
        className={`w-full rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${selectedNow ? 'border-rose-400 bg-rose-50 shadow' : 'border-gray-100 bg-white hover:border-rose-200'}`}
      >
        <div className="flex items-center gap-3">
          <HeroItemVisual item={HERO_ITEM_MAP[item.hero.character]} size={58} showLevel={false} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-gray-700">{heroDisplayName(item.hero)}</div>
            <div className="text-xs text-gray-400">{relation} · {item.name}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums text-indigo-600">{fmt(item.power)}</div>
            <div className="text-[10px] text-gray-400">전투력</div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <VictoryFireworks active={fireworks} />
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl text-rose-600">⚔️ 친구와 대결하기</h2>
          <p className="text-sm text-gray-400">전투력 비율로 승률을 정해 우리 반 친구와 겨뤄요.</p>
        </div>
        <Link to="/student/hero" className="ml-auto rounded-2xl bg-indigo-100 px-4 py-2 text-sm text-indigo-600">용사키우기 →</Link>
      </div>

      {msg && <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <div className="rounded-3xl bg-gradient-to-r from-rose-500 to-orange-400 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-white/75 text-sm">내 용사</div>
            <div className="text-2xl font-bold">{heroDisplayName(myHero)}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-white/75 text-xs">전투력</div>
            <div className="text-3xl font-bold tabular-nums">{fmt(myPower)}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-xl bg-white/20 px-3 py-1.5">기본 대결 {Math.min(attempts, HERO_DUEL_LIMIT)} / {HERO_DUEL_LIMIT}회</span>
          {attempts >= HERO_DUEL_LIMIT && <span className="rounded-xl bg-white/20 px-3 py-1.5">추가 대결 1회 {extraCost}{klass.currency}</span>}
          <span className="rounded-xl bg-white/20 px-3 py-1.5">승리 보상 위 2칸 4 · 위 1칸 3 · 아래 1칸 2 · 아래 2칸 1</span>
        </div>
      </div>

      {!myHero.character ? (
        <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow">
          먼저 용사키우기에서 용사를 구매해야 친구와 대결할 수 있어요.<br />
          <Link to="/student/hero/shop" className="mt-3 inline-block text-indigo-500 underline">용사 상점으로 가기 →</Link>
        </div>
      ) : !students ? (
        <div className="rounded-3xl bg-white p-8 text-center text-gray-400 shadow">친구들의 전투력을 불러오는 중...</div>
      ) : myIndex < 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center text-gray-400 shadow">대결할 수 있는 친구를 찾지 못했어요.</div>
      ) : (
        <>
          <div className="rounded-3xl bg-white p-5 shadow">
            <h3 className="mb-1 text-lg text-gray-700">🎯 대결 상대 선택</h3>
            <p className="mb-4 text-xs text-gray-400">내 전투력 순위에서 위 2명·아래 2명, 최대 4명 중에서 선택할 수 있어요.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {above.map((item) => opponentCard(item, '전투력 위'))}
              {below.map((item) => opponentCard(item, '전투력 아래'))}
            </div>
            {!candidates.length && <div className="py-6 text-center text-gray-400">대결할 친구가 아직 없어요.</div>}
          </div>

          {selected && (
            <>
              <HeroDuelArena
                hero={myHero}
                opponent={selected.hero}
                heroName={heroDisplayName(myHero)}
                opponentName={heroDisplayName(selected.hero)}
                power={myPower}
                opponentPower={selected.power}
                chance={chance}
                phase={battlePhase}
                result={duelResult}
              />
              <div className="rounded-3xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-400">선택한 상대</div>
                  <h3 className="text-xl text-gray-700">{heroDisplayName(selected.hero)}</h3>
                  <div className="text-sm text-gray-400">내 전투력 {fmt(myPower)} vs 상대 {fmt(selected.power)} · {selected.rankDelta < 0 ? `위 ${Math.abs(selected.rankDelta)}칸` : `아래 ${selected.rankDelta}칸`}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">내 승리 확률</div>
                  <div className="text-4xl font-bold tabular-nums text-rose-500">{Math.round(chance * 100)}%</div>
                  <div className="text-xs font-bold text-amber-500">승리 시 {selectedReward}{klass.currency}</div>
                </div>
                <button
                  onClick={challenge}
                  disabled={busy}
                  className="rounded-2xl bg-rose-500 px-6 py-3 font-bold text-white shadow hover:bg-rose-600 disabled:bg-gray-300"
                >
                  {busy ? '대결 중...' : attempts >= HERO_DUEL_LIMIT ? `추가 대결 (${extraCost}${klass.currency})` : '⚔️ 대결 시작'}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400">승률은 내 전투력 ÷ (내 전투력 + 상대 전투력)으로 계산해요.</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
