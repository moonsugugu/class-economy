import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { collection, doc, increment, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { heroBattlePower, heroDateKey, heroDisplayName, normalizeHero } from '../../lib/hero';
import {
  allocateBossRaidRewards,
  bossRaidFor,
  bossRaidRewardPool,
  normalizeBossRaidLevel,
  raidParticipantTotalDamage,
} from '../../lib/bossRaid';
import { isActiveStudent } from '../../lib/studentState';
import BossRaidVisual from '../../components/BossRaidVisual.jsx';
import VictoryFireworks from '../../components/VictoryFireworks.jsx';

function bossFromClassState(classData = {}, level, dateKey) {
  const generated = bossRaidFor(level, dateKey);
  const saved = classData.bossRaidActiveBoss;
  if (!saved || typeof saved !== 'object' || normalizeBossRaidLevel(saved.level) !== generated.level || !saved.designId) {
    return generated;
  }
  return {
    ...generated,
    ...saved,
    level: generated.level,
    maxHp: generated.maxHp,
    visual: { ...generated.visual, ...(saved.visual || {}) },
  };
}

function bossStateSnapshot(boss, rewardPool) {
  return {
    level: boss.level,
    name: boss.name,
    designId: boss.designId,
    visual: boss.visual,
    maxHp: boss.maxHp,
    rewardPool,
  };
}

export default function BossRaidPage() {
  const { klass, student } = useOutletContext();
  const [raid, setRaid] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [fireworks, setFireworks] = useState(false);
  const today = heroDateKey();
  const raidRef = doc(db, 'classes', klass.id, 'bossRaids', today);
  const participantCollection = collection(db, 'classes', klass.id, 'bossRaids', today, 'participants');
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const classRef = doc(db, 'classes', klass.id);
  const hero = normalizeHero(student.rpg);
  const levelPreview = normalizeBossRaidLevel(klass.bossRaidLevel);
  const previewBoss = bossFromClassState(klass, levelPreview, today);
  const currentBoss = raid || previewBoss;
  const rewardPool = Number(raid?.rewardPool) || Number(currentBoss.rewardPool) || bossRaidRewardPool(klass, currentBoss.level);
  const defeated = raid?.status === 'defeated';
  const completed = Boolean(klass.bossRaidComplete) && !raid;
  const raidFinished = defeated || completed;
  const myContribution = participants.find((participant) => participant.studentId === student.id) || null;
  const fixedDamage = hero.character ? Math.max(1, heroBattlePower(hero)) : 0;
  const totalDamage = Math.max(0, Number(raid?.totalDamage) || raidParticipantTotalDamage(participants));
  const savedHp = Number(klass.bossRaidHp);
  const previewHp = Number.isFinite(savedHp) && savedHp > 0
    ? Math.min(currentBoss.maxHp, savedHp)
    : currentBoss.maxHp;
  const remainingHp = raidFinished ? 0 : raid ? Math.max(0, Number(raid.hp) || 0) : previewHp;
  const nextLevel = Math.min(100, Number(currentBoss.level) + 1);

  useEffect(() => {
    let alive = true;
    setInitializing(true);
    const initialize = async () => {
      try {
        await runTransaction(db, async (tx) => {
          const currentRaidSnap = await tx.get(raidRef);
          if (currentRaidSnap.exists()) return;
          const classSnap = await tx.get(classRef);
          const classData = classSnap.data() || {};
          if (classData.bossRaidComplete) return;
          const level = normalizeBossRaidLevel(classData.bossRaidLevel);
          const savedBoss = classData.bossRaidActiveBoss;
          const hasSavedBoss = Boolean(
            savedBoss && typeof savedBoss === 'object' && savedBoss.designId
              && normalizeBossRaidLevel(savedBoss.level) === level,
          );
          const boss = bossFromClassState(classData, level, today);
          const rewardPoolForBoss = hasSavedBoss && Number(savedBoss.rewardPool) > 0
            ? Math.floor(Number(savedBoss.rewardPool))
            : bossRaidRewardPool(classData, boss.level);
          const startingHp = hasSavedBoss && Number.isFinite(Number(classData.bossRaidHp))
            ? Math.max(0, Math.min(boss.maxHp, Number(classData.bossRaidHp)))
            : boss.maxHp;
          tx.set(raidRef, {
            dateKey: today,
            status: 'active',
            level: boss.level,
            name: boss.name,
            designId: boss.designId,
            visual: boss.visual,
            maxHp: boss.maxHp,
            hp: startingHp,
            rewardPool: rewardPoolForBoss,
            totalDamage: 0,
            participantCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          if (!hasSavedBoss) {
            tx.update(classRef, {
              bossRaidActiveBoss: bossStateSnapshot(boss, rewardPoolForBoss),
              bossRaidHp: startingHp,
            });
          }
        });
      } catch (error) {
        if (alive) setMsg({ type: 'err', text: `오늘 보스를 불러오지 못했어요: ${error.message}` });
      } finally {
        if (alive) setInitializing(false);
      }
    };
    initialize();
    return () => { alive = false; };
  }, [klass.id, today]);

  useEffect(() => onSnapshot(raidRef, (snap) => setRaid(snap.exists() ? { id: snap.id, ...snap.data() } : null)), [klass.id, today]);

  useEffect(() => onSnapshot(participantCollection, (snap) => {
    setParticipants(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  }), [klass.id, today]);

  const leaderboard = useMemo(() => [...participants]
    .filter((participant) => Number(participant.damage) > 0)
    .sort((a, b) => Number(b.damage) - Number(a.damage) || String(a.studentName || '').localeCompare(String(b.studentName || ''), 'ko')),
  [participants]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const attack = async () => {
    if (busy || !raid || raid.status !== 'active') return;
    if (!hero.character) {
      flash('err', '먼저 용사키우기에서 캐릭터를 구매해 주세요.');
      return;
    }
    if (myContribution?.attacked) {
      flash('err', '오늘은 이미 보스레이드에 참여했어요.');
      return;
    }
    setBusy(true);
    try {
      let result = null;
      await runTransaction(db, async (tx) => {
        const [raidSnap, studentSnap, participantSnap, classSnap] = await Promise.all([
          tx.get(raidRef),
          tx.get(studentRef),
          tx.get(doc(participantCollection, student.id)),
          tx.get(classRef),
        ]);
        if (!raidSnap.exists()) throw new Error('오늘 보스가 아직 소환되지 않았어요. 잠시 후 다시 눌러 주세요.');
        if (!studentSnap.exists()) throw new Error('학생 정보를 찾을 수 없어요.');
        const currentRaid = raidSnap.data() || {};
        if (currentRaid.status !== 'active') throw new Error('오늘 보스레이드는 이미 종료됐어요.');
        const currentParticipant = participantSnap.exists() ? participantSnap.data() || {} : {};
        if (currentParticipant.attacked) throw new Error('오늘은 이미 참여했어요.');
        const currentStudent = studentSnap.data() || {};
        if (!isActiveStudent(currentStudent)) throw new Error('현재 참여할 수 없는 학생 계정이에요.');
        const currentHero = normalizeHero(currentStudent.rpg);
        if (!currentHero.character) throw new Error('먼저 용사키우기에서 캐릭터를 구매해 주세요.');

        const rawDamage = Math.max(1, heroBattlePower(currentHero));
        const hp = Math.max(0, Number(currentRaid.hp) || 0);
        const damage = Math.min(rawDamage, hp);
        const nextHp = Math.max(0, hp - damage);
        const nextParticipant = {
          ...currentParticipant,
          studentId: student.id,
          studentName: currentStudent.name || student.name,
          avatar: currentStudent.avatar?.base || '🙂',
          damage: (Number(currentParticipant.damage) || 0) + damage,
          attacks: (Number(currentParticipant.attacks) || 0) + 1,
          attacked: true,
          lastDamage: damage,
          updatedAt: Date.now(),
        };

        if (nextHp > 0) {
          tx.update(raidRef, {
            hp: nextHp,
            totalDamage: (Number(currentRaid.totalDamage) || 0) + damage,
            participantCount: (Number(currentRaid.participantCount) || 0) + (participantSnap.exists() ? 0 : 1),
            updatedAt: Date.now(),
          });
          tx.update(classRef, {
            bossRaidActiveBoss: bossStateSnapshot(currentRaid, Number(currentRaid.rewardPool) || bossRaidRewardPool(classSnap.data() || {}, currentRaid.level)),
            bossRaidHp: nextHp,
          });
          tx.set(doc(participantCollection, student.id), nextParticipant, { merge: true });
          result = { damage, defeated: false, reward: 0, hp: nextHp };
          return;
        }

        // 마지막 공격까지 포함한 전체 기여도를 읽어 비례 보상을 계산합니다.
        const allParticipantsSnap = await tx.get(participantCollection);
        const participantMap = new Map(
          allParticipantsSnap.docs.map((item) => [item.id, { id: item.id, ...item.data() }]),
        );
        participantMap.set(student.id, { id: student.id, ...nextParticipant });
        const payouts = allocateBossRaidRewards([...participantMap.values()], Number(currentRaid.rewardPool) || bossRaidRewardPool(classSnap.data() || {}, currentRaid.level));
        const finalTotalDamage = raidParticipantTotalDamage([...participantMap.values()]);
        const payoutStudentRefs = payouts.map((payout) => doc(db, 'classes', klass.id, 'students', payout.studentId));
        const payoutStudentSnaps = await Promise.all(payoutStudentRefs.map((ref) => tx.get(ref)));
        const payoutById = new Map(payouts.map((payout) => [payout.studentId, payout]));

        tx.update(raidRef, {
          hp: 0,
          totalDamage: finalTotalDamage,
          participantCount: participantMap.size,
          status: 'defeated',
          defeatedAt: Date.now(),
          defeatedBy: student.id,
          updatedAt: Date.now(),
        });
        tx.update(classRef, currentRaid.level >= 100
          ? {
            bossRaidComplete: true,
            bossRaidLastDefeatedDate: today,
            bossRaidActiveBoss: null,
            bossRaidHp: 0,
          }
          : {
            bossRaidLevel: Math.min(100, Number(currentRaid.level) + 1),
            bossRaidLastDefeatedDate: today,
            bossRaidActiveBoss: null,
            bossRaidHp: 0,
          });

        payouts.forEach((payout, index) => {
          const payoutRef = doc(participantCollection, payout.studentId);
          tx.set(payoutRef, {
            ...payout,
            reward: payout.reward,
            rewardedAt: Date.now(),
            status: 'rewarded',
          }, { merge: true });
          if (payout.reward > 0 && payoutStudentSnaps[index]?.exists()) {
            tx.update(payoutStudentRefs[index], { cash: increment(payout.reward) });
          }
        });
        const myPayout = payoutById.get(student.id);
        result = { damage, defeated: true, reward: myPayout?.reward || 0, hp: 0, payouts: payouts.length, nextLevel: currentRaid.level >= 100 ? null : Number(currentRaid.level) + 1 };
      });
      if (result.defeated) {
        setFireworks(true);
        setTimeout(() => setFireworks(false), 3200);
        flash('ok', `🏆 보스를 물리쳤어요! 내 기여도 ${fmt(result.damage)} · 상금 ${fmt(result.reward)}${klass.currency} · 참여자 ${result.payouts}명`);
      } else {
        flash('ok', `⚔️ 확률 없이 ${fmt(result.damage)} 데미지를 입혔어요! 보스 HP ${fmt(result.hp)} 남음`);
      }
    } catch (error) {
      flash('err', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <VictoryFireworks active={fireworks} />
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl text-violet-600">🛡️ 학급 보스레이드</h2>
          <p className="text-sm text-gray-400">친구들과 하루 한 번 확정 데미지를 모아 오늘의 보스를 쓰러뜨려요.</p>
        </div>
        <Link to="/student/hero/duel" className="ml-auto rounded-2xl bg-rose-100 px-4 py-2 text-sm text-rose-600">친구 대결 →</Link>
      </div>

      {msg && <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <section className="boss-raid-panel rounded-[2rem] p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="boss-raid-kicker">CLASS RAID · {today}</span>
          {completed && <span className="boss-raid-status boss-raid-status-done">100단계 완주</span>}
          {defeated && <span className="boss-raid-status boss-raid-status-done">오늘 토벌 완료</span>}
          {!raidFinished && <span className="boss-raid-status">확률 없음 · 확정 데미지</span>}
        </div>
        <div className="grid items-center gap-5 lg:grid-cols-[260px_minmax(0,1fr)_220px]">
          <div className="flex justify-center">
            <BossRaidVisual boss={currentBoss} size={230} defeated={raidFinished} />
          </div>
          <div className="min-w-0 text-white">
            <div className="text-xs font-bold tracking-[0.24em] text-cyan-200">BOSS LEVEL {currentBoss.level} / 100</div>
            <h3 className="mt-1 text-3xl font-black tracking-tight">{currentBoss.name}</h3>
            <p className="mt-1 text-sm text-indigo-100">{raidFinished ? '친구들의 협동으로 보스레이드 목표를 달성했어요.' : '참여한 학생의 장착 용사 전투력이 그대로 데미지가 됩니다.'}</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-indigo-200">남은 HP</div>
                <div className="text-3xl font-black tabular-nums">{fmt(remainingHp)} <span className="text-base text-indigo-200">/ {fmt(currentBoss.maxHp)}</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-indigo-200">보상 풀</div>
                <div className="text-xl font-bold text-amber-300">{fmt(rewardPool)}{klass.currency}</div>
              </div>
            </div>
            <div className="boss-raid-hp-track mt-2"><div style={{ width: `${Math.max(0, Math.min(100, (remainingHp / currentBoss.maxHp) * 100))}%` }} /></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-indigo-100">
              <span className="rounded-full bg-white/10 px-3 py-1.5">내 확정 데미지 {fmt(fixedDamage)}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">누적 데미지 {fmt(totalDamage)}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">참여 {participants.length}명</span>
            </div>
          </div>
          <div className="boss-raid-action-card rounded-3xl p-4 text-center">
            {hero.character ? (
              <>
                <div className="text-xs text-indigo-200">{heroDisplayName(hero)}</div>
                <div className="mt-1 text-4xl font-black tabular-nums text-white">{fmt(fixedDamage)}</div>
                <div className="text-xs text-indigo-200">이번 공격 확정 데미지</div>
                <button
                  onClick={attack}
                  disabled={busy || initializing || raidFinished || myContribution?.attacked || !raid}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:bg-none disabled:opacity-55"
                >
                  {busy ? '공격 처리 중...' : myContribution?.attacked ? '오늘 참여 완료 ✓' : completed ? '100단계 완주' : defeated ? '오늘 토벌 완료' : initializing ? '보스 소환 중...' : '⚔️ 보스 공격'}
                </button>
              </>
            ) : (
              <>
                <div className="text-3xl">⚔️</div>
                <div className="mt-2 font-bold text-white">용사가 필요해요</div>
                <Link to="/student/hero/shop" className="mt-3 inline-block text-xs text-cyan-200 underline">용사 상점으로 가기</Link>
              </>
            )}
            <div className="mt-3 text-[11px] leading-relaxed text-indigo-200">하루 1회 참여 · 확률 없이 전투력만큼 피해 · 보스 처치 시 데미지 비례 보상</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-xl text-gray-700">📊 오늘의 기여도</h3>
          <span className="text-xs text-gray-400">보스 처치 시 데미지 비율로 상금을 나눠요.</span>
          {raidFinished && <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">총 {fmt(rewardPool)}{klass.currency} 배부 완료</span>}
        </div>
        {!leaderboard.length ? (
          <div className="rounded-2xl bg-violet-50 py-8 text-center text-sm text-violet-500">
            {completed ? '100단계 완주로 모든 보스레이드 보상이 정산되었어요.' : '아직 공격한 친구가 없어요. 첫 번째로 공격해 보세요!'}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((participant, index) => {
              const ratio = totalDamage > 0 ? (Number(participant.damage) / totalDamage) * 100 : 0;
              return (
                <div key={participant.id} className={`boss-raid-participant flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${participant.studentId === student.id ? 'boss-raid-participant-me' : ''}`}>
                  <div className={`boss-raid-rank boss-raid-rank-${Math.min(index + 1, 3)}`}>{index + 1}</div>
                  <div className="text-xl">{participant.avatar || '🙂'}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-700">{participant.studentName || '학생'} {participant.studentId === student.id && <span className="text-xs text-violet-500">(나)</span>}</div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" style={{ width: `${Math.max(2, ratio)}%` }} /></div>
                  </div>
                  <div className="w-24 text-right">
                    <div className="font-black tabular-nums text-violet-600">{fmt(participant.damage)}</div>
                    <div className="text-[10px] text-gray-400">{ratio.toFixed(1)}%</div>
                  </div>
                  <div className="w-20 text-right font-bold text-amber-600">{raidFinished ? `+${fmt(participant.reward || 0)}` : '대기 중'}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-700">
        {currentBoss.level >= 100 && raidFinished
          ? '🏆 100단계 최종 보스를 정복했어요! 학급 보스레이드가 완주되었습니다.'
          : defeated
            ? `내일은 ${nextLevel}단계의 새로운 보스가 순서대로 등장해요.`
            : `오늘 보스를 잡지 못하면 내일도 같은 ${currentBoss.level}단계 보스가 남은 HP 그대로 이어져요.`}
      </div>
    </div>
  );
}
