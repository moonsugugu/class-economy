import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import {
  MARKET_PATH, advance, dueScheduleKeys, nextFx, DEFAULT_FX,
  fetchRealQuotes, applyRealPrices, mergeSeedStocks, stockListsEqual,
} from './stocks';
import { periodKeys, rankAssets } from './util';

/**
 * 랭킹 기준값 기록 — 오늘/이번 주/이번 달이 시작될 때의 자산을 저장해요.
 * 기간이 바뀐 첫 접속에만 쓰기가 일어나서 비용이 거의 없습니다.
 */
export async function ensureBaselines(classId, student, stocks, fx, krwPerUnit = 1) {
  const keys = periodKeys();
  const snap = student.snap || {};
  const now = rankAssets(student, stocks, fx, krwPerUnit);
  const upd = {};
  for (const k of ['d', 'w', 'm']) {
    if (snap[k]?.k !== keys[k]) upd[`snap.${k}`] = { k: keys[k], v: now };
  }
  if (!Object.keys(upd).length) return;
  try {
    await updateDoc(doc(db, 'classes', classId, 'students', student.id), upd);
  } catch { /* 실패해도 게임 진행에는 지장 없음 */ }
}

/** 예전 시장 문서의 ???·누락 필드·중복 종목을 한 번에 복구합니다. */
export async function repairMarketStocks(classId) {
  const ref = doc(db, ...MARKET_PATH(classId));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return false;
    const current = snap.data()?.stocks || [];
    const stocks = mergeSeedStocks(current);
    if (stockListsEqual(current, stocks)) return false;
    tx.update(ref, { stocks, updatedAt: Date.now() });
    return true;
  });
}

/**
 * 예약된 시세 변동(아침 8:30 · 오후 3:00)을 적용해요.
 * 서버가 없으므로 그 시각 이후 앱을 연 사람이 처리하지만,
 * 트랜잭션으로 묶여 있어 여러 명이 동시에 열어도 딱 한 번만 반영됩니다.
 */
export async function applyScheduledTicks(classId) {
  const ref = doc(db, ...MARKET_PATH(classId));

  // 예약 시각이 지났으면 실제 시세를 먼저 받아 둡니다 (실패하면 시뮬레이션으로)
  let real = null;
  try {
    real = await fetchRealQuotes();
  } catch {
    real = null;
  }

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const m = snap.data();
      const done = m.schedDone || [];
      const todo = dueScheduleKeys().filter((k) => !done.includes(k));
      let stocks = mergeSeedStocks(m.stocks || []);
      let fx = m.fx || DEFAULT_FX;
      const repaired = !stockListsEqual(m.stocks || [], stocks);
      if (!todo.length && !repaired) return;

      if (real?.prices) {
        stocks = applyRealPrices(stocks, real.prices);
        if (real.fx) fx = real.fx;
      } else {
        todo.forEach(() => {
          stocks = stocks.map((s) => advance(s));
          fx = nextFx(fx);
        });
      }

      tx.update(ref, {
        stocks,
        fx,
        realAt: real?.prices ? Date.now() : (m.realAt || null),
        schedDone: [...done, ...todo].slice(-8),
        updatedAt: Date.now(),
      });
    });
  } catch {
    /* 다른 사람이 먼저 처리했으면 그대로 두면 됩니다 */
  }
}
