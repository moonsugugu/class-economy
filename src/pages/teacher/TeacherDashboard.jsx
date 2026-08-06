import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  collection, doc, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, getDocs, setDoc, writeBatch,
  runTransaction, increment, serverTimestamp, deleteField,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { fmt, makeClassCode, netAssets } from '../../lib/util';
import {
  changePct, advance, usedTicks, makeInitialMarket, makeCustomStock, mergeSeedStocks,
  MARKET_PATH, MARKET_LABEL, DEFAULT_TICK_LIMIT, MAX_TICK_LIMIT, normalizedTickLimit, AUTO_TICK_MS, DEFAULT_FX, todayKey,
  pendingSchedule, SCHEDULE_LABEL, fetchRealQuotes, applyRealPrices,
  DEFAULT_KRW_PER_UNIT,
} from '../../lib/stocks';
import { applyScheduledTicks } from '../../lib/marketSync';
import { SHOP_PRESETS } from '../../lib/shopPresets';
import { grossPay, taxOf } from '../../lib/jobs';
import { TAX_PARTS, TAX_LEDGER_ID, taxRates } from '../../lib/taxes';
import { isActiveStudent } from '../../lib/studentState';
import { ITEM_MAP } from '../../lib/items';
import { HERO_ITEM_MAP, normalizeHero } from '../../lib/hero';
import { PRICE_MODE_PERCENT, PRICE_MODE_UNIT, pricePolicyLabel } from '../../lib/pricing';
import { loanDueAmount } from '../../lib/loans.js';
import {
  DEFAULT_LOTTERY_DISTRIBUTION_RATE,
  DEFAULT_LOTTERY_PRIZE,
  DEFAULT_LOTTERY_PRICE,
  DEFAULT_LOTTERY_RECIPIENTS,
  DEFAULT_LOTTERY_SUPPORT_RATE,
  DEFAULT_LOTTERY_WIN_PROBABILITY,
} from '../../lib/lottery.js';
import SeatsTab from './SeatsTab.jsx';
import ReportsTab from './ReportsTab.jsx';
import JobsTab from './JobsTab.jsx';
import FundTab from './FundTab.jsx';
import InviteQR from '../../components/InviteQR.jsx';
import EconomyEventsPanel from './EconomyEventsPanel.jsx';
import RecoveryTab from './RecoveryTab.jsx';
import MissionsTab from './MissionsTab.jsx';
import LotteryTab from './LotteryTab.jsx';
import FeatureGuideModal from '../../components/FeatureGuideModal.jsx';

const card = 'bg-white rounded-3xl shadow p-6';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 outline-none';
const btn = 'rounded-xl px-4 py-2 text-white shadow transition disabled:opacity-40';
const koCollator = new Intl.Collator('ko-KR', { sensitivity: 'base', numeric: false });
const naturalCollator = new Intl.Collator('ko-KR', { sensitivity: 'base', numeric: true });

const firstNumber = (value) => {
  const found = String(value || '').match(/\d+/);
  return found ? Number(found[0]) : null;
};

const sortStudents = (students, mode) => {
  const list = [...students];
  if (mode === 'custom') {
    return list.sort((a, b) => {
      const ao = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bo = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      return ao - bo || naturalCollator.compare(a.name || '', b.name || '');
    });
  }
  if (mode === 'number') {
    return list.sort((a, b) => {
      const an = firstNumber(a.name);
      const bn = firstNumber(b.name);
      if (an !== null && bn !== null && an !== bn) return an - bn;
      if (an !== null && bn === null) return -1;
      if (an === null && bn !== null) return 1;
      return naturalCollator.compare(a.name || '', b.name || '');
    });
  }
  return list.sort((a, b) => koCollator.compare(a.name || '', b.name || ''));
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { teacher, authReady, logoutTeacher } = useApp();
  const [classes, setClasses] = useState(null);
  const [classId, setClassId] = useState(() => localStorage.getItem('ce_teacher_class') || '');
  const [tab, setTab] = useState('students');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [newClassName, setNewClassName] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!teacher) return;
    const q = query(collection(db, 'classes'), where('teacherUid', '==', teacher.uid));
    return onSnapshot(q, (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [teacher]);

  const klass = useMemo(() => {
    if (!classes) return null;
    return classes.find((c) => c.id === classId) || classes[0] || null;
  }, [classes, classId]);

  useEffect(() => {
    if (klass) localStorage.setItem('ce_teacher_class', klass.id);
  }, [klass]);

  // 미지급 주문 배지
  useEffect(() => {
    if (!klass) return;
    const q = query(collection(db, 'classes', klass.id, 'purchases'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => setPendingCount(snap.size));
  }, [klass?.id]);

  useEffect(() => {
    if (!klass) return;
    const q = query(collection(db, 'classes', klass.id, 'paymentRequests'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => setPendingPaymentCount(snap.size));
  }, [klass?.id]);

  if (!authReady) return <Center>불러오는 중...</Center>;
  if (!teacher) return <Navigate to="/" replace />;
  if (classes === null) return <Center>학급 정보를 불러오는 중...</Center>;

  const createClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    const ref = await addDoc(collection(db, 'classes'), {
      name,
      code: makeClassCode(),
      joinPin: String(Math.floor(1000 + Math.random() * 9000)), // 학생 입장 비밀번호 4자리
      teacherUid: teacher.uid,
      currency: '미소',
      salary: 100,
      depositRate: 2,
      savingsRate: 5,
      loanRate: 10,
      loanLimit: 1000,
      lotteryPrice: DEFAULT_LOTTERY_PRICE,
      lotteryWinProbability: DEFAULT_LOTTERY_WIN_PROBABILITY,
      lotteryPrize: DEFAULT_LOTTERY_PRIZE,
      lotterySupportRate: DEFAULT_LOTTERY_SUPPORT_RATE,
      lotterySupportRecipients: DEFAULT_LOTTERY_RECIPIENTS,
      lotteryDistributionRate: DEFAULT_LOTTERY_DISTRIBUTION_RATE,
      lotterySupportFund: 0,
      createdAt: serverTimestamp(),
    });
    setNewClassName('');
    setClassId(ref.id);
  };

  const tabs = [
    ['students', '🧑‍🎓', '학생', 'from-emerald-400 to-teal-500'],
    ['shop', '🏪', '상점', 'from-amber-400 to-orange-500'],
    ['alerts', '🔔', pendingCount + pendingPaymentCount ? `알림 ${pendingCount + pendingPaymentCount}` : '알림', 'from-rose-400 to-pink-500'],
    ['stocks', '📈', '주식', 'from-blue-400 to-indigo-500'],
    ['missions', '🎯', '오늘의 미션', 'from-indigo-400 to-cyan-500'],
    ['jobs', '🧑‍🍳', '직업', 'from-teal-400 to-emerald-500'],
    ['fund', '🏛️', '공동기금', 'from-emerald-400 to-green-500'],
    ['lottery', '🎟️', '복권', 'from-fuchsia-400 to-indigo-500'],
    ['seats', '🪑', '자리', 'from-teal-400 to-cyan-500'],
    ['reports', '🐞', '건의함', 'from-fuchsia-400 to-rose-500'],
    ['recovery', '🧯', '파산·회생', 'from-rose-400 to-orange-500'],
    ['settings', '⚙️', '설정', 'from-slate-400 to-gray-500'],
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      {/* 헤더 배너 */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg p-6 mb-5">
        <div className="absolute -right-6 -top-8 text-8xl opacity-20 select-none">🏫</div>
        <div className="absolute right-24 bottom-2 text-4xl opacity-20 select-none">✨</div>
        <div className="flex flex-wrap items-center gap-3 relative">
          <button onClick={() => navigate('/')} className="text-4xl drop-shadow">🏦</button>
          <div>
            <h1 className="text-2xl leading-tight">{klass ? klass.name : '우리 반 경제나라'} <span className="opacity-70 text-base">선생님 대시보드</span></h1>
            <p className="text-white/70 text-sm">👩‍🏫 {teacher.displayName}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {klass && (
              <>
                <button
                  onClick={() => navigator.clipboard.writeText(klass.code)}
                  title="클릭하면 복사돼요"
                  className="bg-white/20 backdrop-blur rounded-2xl px-4 py-2 tracking-widest font-bold hover:bg-white/30 transition"
                >
                  🔑 {klass.code}
                </button>
                <button
                  onClick={() => setShowInvite(true)}
                  title="학생 초대 QR 코드 보기"
                  className="bg-white text-indigo-600 rounded-2xl px-4 py-2 shadow hover:scale-105 transition"
                >
                  📱 초대 QR
                </button>
                <span className="bg-white/20 backdrop-blur rounded-2xl px-4 py-2">💰 {klass.currency}</span>
              </>
            )}
            <button
              onClick={async () => { await logoutTeacher(); navigate('/'); }}
              className="text-white/60 underline text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
        {/* 학급 선택/생성 */}
        <div className="flex gap-2 mt-4 flex-wrap relative">
          {classes.length > 0 && (
            <select
              value={klass?.id || ''}
              onChange={(e) => setClassId(e.target.value)}
              className="rounded-xl px-3 py-2 text-indigo-700 bg-white/90 outline-none"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="새 학급 이름 (예: 3학년 2반)"
            className="rounded-xl px-3 py-2 bg-white/90 text-gray-700 outline-none flex-1 min-w-40 placeholder:text-gray-400"
          />
          <button onClick={createClass} className="rounded-xl px-4 py-2 bg-white text-indigo-600 shadow hover:scale-105 transition">
            ➕ 학급 만들기
          </button>
        </div>
      </header>

      {klass && (
        <>
          <nav className="flex gap-2 mb-5 flex-wrap">
            {tabs.map(([id, emoji, label, grad]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2.5 rounded-2xl text-lg transition flex items-center gap-1.5 ${
                  tab === id
                    ? `bg-gradient-to-r ${grad} text-white shadow-lg scale-105`
                    : 'bg-white text-gray-500 hover:scale-105 shadow-sm'
                }`}
              >
                <span className="text-xl">{emoji}</span>{label}
              </button>
            ))}
          </nav>
          {tab === 'students' && <StudentsTab klass={klass} />}
          {tab === 'shop' && <ShopTab klass={klass} />}
          {tab === 'alerts' && <AlertsTab klass={klass} />}
          {tab === 'stocks' && <StocksTab klass={klass} />}
          {tab === 'missions' && <MissionsTab klass={klass} />}
          {tab === 'jobs' && <JobsTab klass={klass} />}
          {tab === 'fund' && <FundTab klass={klass} />}
          {tab === 'lottery' && <LotteryTab klass={klass} />}
          {tab === 'seats' && <SeatsTab klass={klass} />}
          {tab === 'reports' && <ReportsTab klass={klass} teacherEmail={teacher.email} />}
          {tab === 'recovery' && <RecoveryTab klass={klass} />}
          {tab === 'settings' && (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
              <div className="space-y-4">
                <SettingsTab klass={klass} />
                <EconomyEventsPanel klass={klass} />
              </div>
              <PinManager klass={klass} />
            </div>
          )}
        </>
      )}

      {showInvite && klass && (
        <InviteQR klass={klass} onClose={() => setShowInvite(false)} />
      )}
      <FeatureGuideModal role="teacher" />
    </div>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-xl text-gray-400">{children}</div>;
}

/* ---------- 학생 관리: 월급 지급 / 상벌점 화폐 증감 ---------- */
function StudentsTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [market, setMarket] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [sortMode, setSortMode] = useState('name');
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'classes', klass.id, 'students'), (snap) =>
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'accounts'), where('status', '==', 'active'));
    return onSnapshot(q, (snap) =>
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [klass.id]);

  useEffect(() => {
    return onSnapshot(collection(db, 'classes', klass.id, 'loans'), (snap) =>
      setLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [klass.id]);

  useEffect(() => {
    return onSnapshot(doc(db, ...MARKET_PATH(klass.id)), (snap) => {
      setMarket(snap.exists() ? snap.data() : null);
    });
  }, [klass.id]);

  const activeStudents = useMemo(() => students.filter(isActiveStudent), [students]);
  const archivedStudents = useMemo(() => students.filter((s) => !isActiveStudent(s)), [students]);
  const sortedStudents = useMemo(() => sortStudents(activeStudents, sortMode), [activeStudents, sortMode]);
  const savingsByStudent = useMemo(() => {
    const totals = new Map();
    accounts.forEach((account) => {
      totals.set(account.studentId, (totals.get(account.studentId) || 0) + (Number(account.amount) || 0));
    });
    return totals;
  }, [accounts]);
  const loansByStudent = useMemo(() => {
    const totals = new Map();
    loans.forEach((loan) => {
      if (!['active', 'overdue'].includes(loan.status)) return;
      totals.set(loan.studentId, (totals.get(loan.studentId) || 0) + loanDueAmount(loan));
    });
    return totals;
  }, [loans]);
  const marketStocks = market?.stocks || [];
  const fx = Number(market?.fx) || DEFAULT_FX;
  const kpu = Number(klass.krwPerUnit) || DEFAULT_KRW_PER_UNIT;
  const wholeFmt = (value) => fmt(Math.floor(Number(value) || 0));

  const stockValueOf = (student) => Object.entries(student.holdings || {}).reduce((total, [symbol, holding]) => {
    const stock = marketStocks.find((item) => (item.symbol || item.id) === symbol);
    const quantity = Number(holding?.qty) || 0;
    if (!stock || quantity <= 0) return total;
    const rawValue = Number(stock.price) * quantity;
    if (stock.market === 'US') return total + (rawValue * fx) / kpu;
    if (stock.market === 'KR') return total + rawValue / kpu;
    return total + rawValue;
  }, 0);

  const spaceSpendingOf = (student) => (student.inventory || []).reduce(
    (total, itemId) => total + (Number(ITEM_MAP[itemId]?.price) || 0),
    0
  );

  const heroItemSpendingOf = (student) => (student.rpg?.owned || []).reduce(
    (total, itemId) => total + (Number(HERO_ITEM_MAP[itemId]?.price) || 0),
    0
  );

  const heroStageOf = (student) => {
    const hero = normalizeHero(student.rpg);
    return hero.character ? `${hero.clearedLevel}단계` : '미시작';
  };

  const assetBreakdownOf = (student) => {
    const savings = savingsByStudent.get(student.id) || 0;
    const stocks = stockValueOf(student);
    const studentAccounts = accounts.filter((account) => account.studentId === student.id);
    const studentLoans = loans.filter((loan) => loan.studentId === student.id);
    return {
      total: netAssets(student, marketStocks, fx, kpu, studentAccounts, studentLoans),
      cash: Number(student.cash) || 0,
      deposit: Number(student.deposit) || 0,
      savings,
      stocks,
      spaceSpending: spaceSpendingOf(student),
      heroItemSpending: heroItemSpendingOf(student),
      loan: loansByStudent.get(student.id) || 0,
    };
  };

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allSelected = sortedStudents.length > 0 && selected.size === sortedStudents.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sortedStudents.map((s) => s.id)));
  const targets = activeStudents.filter((s) => selected.has(s.id));

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // 월급 = 기본 월급 + 직업 수당, 세금은 자동으로 학급 공동기금에 적립돼요
  const paySalary = async () => {
    if (!targets.length) return flash('먼저 학생을 선택해 주세요.');
    const rate = taxRates(klass).salary;
    const batch = writeBatch(db);
    let totalTax = 0, totalNet = 0;
    targets.forEach((s) => {
      const gross = grossPay(klass, { salary: s.jobSalary || 0 });
      const { tax, net } = taxOf(gross, rate);
      totalTax += tax; totalNet += net;
      batch.update(doc(db, 'classes', klass.id, 'students', s.id), { cash: increment(net) });
    });
    if (totalTax > 0) {
      batch.set(doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID), {
        pending: increment(totalTax),
        salary: increment(totalTax),
        updatedAt: Date.now(),
      }, { merge: true });
    }
    await batch.commit();
    flash(
      totalTax > 0
        ? `💰 ${targets.length}명 월급 지급! 실수령 ${fmt(totalNet)} · 세금 ${fmt(totalTax)}${klass.currency}가 누적됐어요. 공동기금 화면에서 정산해 주세요.`
        : `💰 ${targets.length}명에게 월급 ${fmt(totalNet)}${klass.currency}를 지급했어요!`
    );
  };

  const adjust = async (sign) => {
    const amt = Math.abs(Number(amount));
    if (!amt) return flash('금액을 입력해 주세요.');
    if (!targets.length) return flash('먼저 학생을 선택해 주세요.');
    const batch = writeBatch(db);
    targets.forEach((s) => batch.update(doc(db, 'classes', klass.id, 'students', s.id), { cash: increment(sign * amt) }));
    await batch.commit();
    flash(`${sign > 0 ? '➕ 지급' : '➖ 차감'} 완료 (${targets.length}명, ${fmt(amt)}${klass.currency}${reason ? `, 사유: ${reason}` : ''})`);
    setAmount(''); setReason('');
  };

  const removeStudent = async (s) => {
    if (!confirm(`'${s.name}' 학생 계정을 보관할까요?\n학생 문서와 현금·예금·주식·거래 데이터는 삭제하지 않고 보관합니다.`)) return;
    await updateDoc(doc(db, 'classes', klass.id, 'students', s.id), { archivedAt: serverTimestamp() });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(s.id);
      return next;
    });
    flash(`📦 ${s.name} 학생 계정을 보관했어요. 기존 데이터는 보존돼요.`);
  };

  const deleteStudent = async (s) => {
    if (!confirm(`'${s.name}' 학생을 정말 삭제할까요?\n학생 문서가 영구 삭제되며, 구매·지급요청·거래 기록은 별도로 남을 수 있습니다.`)) return;
    await deleteDoc(doc(db, 'classes', klass.id, 'students', s.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(s.id);
      return next;
    });
    flash(`🗑️ ${s.name} 학생을 삭제했어요.`);
  };

  const restoreStudent = async (s) => {
    if (!confirm(`'${s.name}' 학생 계정을 다시 활성화할까요?`)) return;
    await updateDoc(doc(db, 'classes', klass.id, 'students', s.id), { archivedAt: deleteField() });
    flash(`↩️ ${s.name} 학생 계정을 복구했어요.`);
  };

  const saveCustomOrder = async (ordered) => {
    const batch = writeBatch(db);
    ordered.forEach((s, index) => {
      batch.update(doc(db, 'classes', klass.id, 'students', s.id), { sortOrder: index + 1 });
    });
    await batch.commit();
  };

  const moveStudent = async (targetId) => {
    if (!draggingId || draggingId === targetId) return;
    const from = sortedStudents.findIndex((s) => s.id === draggingId);
    const to = sortedStudents.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sortedStudents];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSortMode('custom');
    setStudents((prev) => prev.map((s) => {
      const found = next.find((n) => n.id === s.id);
      return found ? { ...s, sortOrder: next.findIndex((n) => n.id === s.id) + 1 } : s;
    }));
    await saveCustomOrder(next);
    flash('↕️ 학생 순서를 저장했어요.');
  };

  // ⚡ 빠른 지급: 버튼 한 번으로 선택 학생에게 즉시 지급
  const quickGive = async (amt) => {
    if (!targets.length) return flash('먼저 학생을 선택해 주세요.');
    const batch = writeBatch(db);
    targets.forEach((s) => batch.update(doc(db, 'classes', klass.id, 'students', s.id), { cash: increment(amt) }));
    await batch.commit();
    flash(`⚡ ${targets.length}명에게 ${amt > 0 ? '+' : ''}${fmt(amt)}${klass.currency} ${amt > 0 ? '지급' : '차감'} 완료!`);
  };

  return (
    <div className="space-y-4">
      <div className={card + ' space-y-4'}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={paySalary} className={btn + ' bg-gradient-to-r from-emerald-400 to-teal-500 hover:opacity-90 text-lg'}>
            💰 월급 지급 (기본 {fmt(klass.salary)}{klass.currency} + 직업 수당)
          </button>
          {taxRates(klass).salary > 0 && (
            <span className="text-xs bg-emerald-50 text-emerald-700 rounded-xl px-3 py-1.5">
              월급 세금 {taxRates(klass).salary}% → 🏛️공동기금
            </span>
          )}
          <span className="text-sm text-gray-400">
            {selected.size ? `✅ ${selected.size}명 선택됨` : '👇 아래에서 학생을 선택하세요'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 mr-1">⚡ 빠른 지급:</span>
          {[5, 10, 50, 100].map((a) => (
            <button
              key={a}
              onClick={() => quickGive(a)}
              className="rounded-xl px-4 py-2 bg-sky-100 text-sky-700 hover:bg-sky-500 hover:text-white transition shadow-sm text-lg tabular-nums"
            >
              +{a}
            </button>
          ))}
          <span className="text-sm text-gray-500 ml-3 mr-1">차감:</span>
          {[5, 10].map((a) => (
            <button
              key={a}
              onClick={() => quickGive(-a)}
              className="rounded-xl px-3 py-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition shadow-sm tabular-nums"
            >
              −{a}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-gray-400 block">직접 입력</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" className={input + ' w-28'} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block">사유 (선택)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="칭찬, 규칙 위반 등" className={input + ' w-44'} />
          </div>
          <button onClick={() => adjust(1)} className={btn + ' bg-sky-500 hover:bg-sky-600'}>➕ 지급</button>
          <button onClick={() => adjust(-1)} className={btn + ' bg-rose-500 hover:bg-rose-600'}>➖ 차감</button>
        </div>
        {msg && <div className="text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">{msg}</div>}
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="text-xl mr-auto">🧑‍🎓 학생 목록</h3>
          <span className="text-sm text-gray-400">정렬</span>
          {[
            ['name', 'ㄱㄴㄷ순'],
            ['number', '숫자순'],
            ['custom', '직접 순서'],
          ].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`rounded-xl px-3 py-1.5 text-sm transition ${
                sortMode === mode ? 'bg-indigo-500 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="basis-full text-xs text-gray-400">
            행 왼쪽의 ↕ 손잡이를 끌어 놓으면 직접 순서로 저장돼요. 숫자순은 1, 2, 9, 10, 11처럼 정렬됩니다.
          </span>
          <span className="basis-full text-xs text-gray-400">
            총자산은 현금·예금·적금·주식과 원화/달러 환산액에서 미상환 대출을 뺀 순자산이에요. 공간 지출비와 용사 아이템비는 보유 아이템 가격표 기준입니다.
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-100">
          <table className="w-full table-fixed text-left text-[10px] leading-tight">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-400">
                <th className="w-[3%] px-1 py-2"></th>
                <th className="w-[3%] px-1 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4" /></th>
                <th className="w-[12%] px-1 py-2 text-left">이름</th>
                <th className="w-[7%] px-1 py-2 text-center">용사 단계</th>
                <th className="w-[8%] px-1 py-2 text-right">총자산</th>
                <th className="w-[7%] px-1 py-2 text-right">현금</th>
                <th className="w-[7%] px-1 py-2 text-right">예금</th>
                <th className="w-[7%] px-1 py-2 text-right">적금</th>
                <th className="w-[8%] px-1 py-2 text-right">주식</th>
                <th className="w-[7%] px-1 py-2 text-right">대출</th>
                <th className="w-[8%] px-1 py-2 text-right">공간비</th>
                <th className="w-[8%] px-1 py-2 text-right">용사비</th>
                <th className="w-[10%] px-1 py-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s) => {
                const asset = assetBreakdownOf(s);
                return (
                  <tr
                    key={s.id}
                    draggable
                    onDragStart={() => setDraggingId(s.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => moveStudent(s.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`border-b border-gray-100 hover:bg-indigo-50/40 ${draggingId === s.id ? 'opacity-50' : ''}`}
                  >
                    <td className="cursor-grab select-none px-1 py-2 text-center text-gray-300" title="끌어서 순서 바꾸기">↕</td>
                    <td className="px-1 py-2 text-center"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4" /></td>
                    <td className="truncate px-1 py-2 text-left text-[11px]" title={s.name}>
                      {s.avatar?.base || '🙂'} {s.name}
                      {s.jobName && (
                        <span className="ml-1 rounded bg-teal-50 px-1 py-0.5 text-[9px] text-teal-700 align-middle">
                          {s.jobEmoji} {s.jobName} +{wholeFmt(s.jobSalary || 0)}
                        </span>
                      )}
                    </td>
                    <td className={`px-1 py-2 text-center ${heroStageOf(s) === '미시작' ? 'text-gray-300' : 'font-bold text-indigo-600'}`} title="용사키우기 정복 단계">{heroStageOf(s)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right font-semibold">{wholeFmt(asset.total)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right">{wholeFmt(asset.cash)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right text-gray-500">{wholeFmt(asset.deposit)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right text-pink-600">{wholeFmt(asset.savings)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right text-sky-600">{wholeFmt(asset.stocks)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right text-rose-600">{wholeFmt(asset.loan)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right text-purple-600">{wholeFmt(asset.spaceSpending)}</td>
                    <td className="whitespace-nowrap px-1 py-2 text-right text-violet-600">{wholeFmt(asset.heroItemSpending)}</td>
                    <td className="px-1 py-2 text-right">
                      <div className="flex justify-end gap-1">
                      <button
                        onClick={() => removeStudent(s)}
                        className="rounded px-1.5 py-1 text-[9px] bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition"
                      >
                        보관
                      </button>
                        <button
                          onClick={() => deleteStudent(s)}
                          className="rounded px-1.5 py-1 text-[9px] bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!activeStudents.length && (
                <tr><td colSpan={13} className="py-8 text-center text-gray-400">
                  아직 학생이 없어요. 학생들에게 학급 코드 <b>{klass.code}</b>를 알려 주세요!
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {archivedStudents.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-amber-800">📦 보관된 학생 {archivedStudents.length}명</b>
              <span className="text-xs text-amber-700">기존 데이터는 삭제되지 않았습니다.</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {archivedStudents.map((s) => (
                <span key={s.id} className="flex gap-2">
                  <button
                    onClick={() => restoreStudent(s)}
                    className="rounded-xl bg-white px-3 py-2 text-sm text-amber-800 shadow-sm hover:bg-amber-100"
                  >
                    {s.avatar?.base || '🙂'} {s.name} 복구
                  </button>
                  <button
                    onClick={() => deleteStudent(s)}
                    className="rounded-xl bg-white px-3 py-2 text-sm text-rose-500 shadow-sm hover:bg-rose-100"
                  >
                    삭제
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 상점 관리 ---------- */
function ShopTab({ klass }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', emoji: '🎟️', price: '', qty: '', imageUrl: '' });
  const [presetOpen, setPresetOpen] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name || !Number(form.price)) return;
    await addDoc(collection(db, 'classes', klass.id, 'products'), {
      name: form.name,
      emoji: form.emoji || '🎁',
      price: Number(form.price),
      qty: Number(form.qty) || 0,
      imageUrl: form.imageUrl.trim() || null,
      createdAt: serverTimestamp(),
    });
    setForm({ name: '', emoji: '🎟️', price: '', qty: '', imageUrl: '' });
  };

  const pKey = (ci, ii) => `${ci}-${ii}`;
  const togglePick = (k) => setPicked((s) => {
    const n = new Set(s);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });
  const toggleCat = (ci) => {
    const keys = SHOP_PRESETS[ci].items.map((_, ii) => pKey(ci, ii));
    const all = keys.every((k) => picked.has(k));
    setPicked((s) => {
      const n = new Set(s);
      keys.forEach((k) => (all ? n.delete(k) : n.add(k)));
      return n;
    });
  };

  const openPresets = () => {
    // 이미 등록된 이름은 기본 해제, 나머지는 전부 선택
    const existing = new Set(products.map((p) => p.name));
    const s = new Set();
    SHOP_PRESETS.forEach((cat, ci) => cat.items.forEach((it, ii) => {
      if (!existing.has(it.name)) s.add(pKey(ci, ii));
    }));
    setPicked(s);
    setPresetOpen(true);
  };

  const addPresets = async () => {
    if (!picked.size) return;
    setAdding(true);
    try {
      const batch = writeBatch(db);
      SHOP_PRESETS.forEach((cat, ci) => cat.items.forEach((it, ii) => {
        if (!picked.has(pKey(ci, ii))) return;
        batch.set(doc(collection(db, 'classes', klass.id, 'products')), {
          name: it.name, emoji: it.emoji, price: it.price, qty: it.qty,
          imageUrl: null, createdAt: serverTimestamp(),
        });
      }));
      await batch.commit();
      setPresetOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl p-5 flex items-center gap-4 flex-wrap">
        <span className="text-4xl">🧺</span>
        <div className="flex-1 min-w-40">
          <div className="text-amber-800">뭘 팔지 고민되나요?</div>
          <div className="text-sm text-amber-600/70">특권 쿠폰·간식·문구·놀이 등 분야별 예시 상품 30종을 한 번에 담아 보세요. 가격과 수량은 나중에 수정할 수 있어요.</div>
        </div>
        <button onClick={openPresets} className={btn + ' bg-amber-500 hover:bg-amber-600 text-lg'}>
          🧺 예시 상품 담기
        </button>
      </div>

      {presetOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setPresetOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xl">🧺 예시 상품 고르기</h3>
              <span className="text-sm text-gray-400">{picked.size}개 선택됨</span>
              <button onClick={() => setPresetOpen(false)} className="ml-auto text-gray-400 text-xl">✕</button>
            </div>
            {SHOP_PRESETS.map((cat, ci) => (
              <div key={cat.cat} className="mb-4">
                <button onClick={() => toggleCat(ci)} className="text-lg text-indigo-600 mb-2 hover:underline">
                  {cat.cat} <span className="text-xs text-gray-400">(전체 선택/해제)</span>
                </button>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {cat.items.map((it, ii) => {
                    const k = pKey(ci, ii);
                    const dup = products.some((p) => p.name === it.name);
                    return (
                      <label key={k} className={`flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer border-2 transition ${
                        picked.has(k) ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
                      }`}>
                        <input type="checkbox" checked={picked.has(k)} onChange={() => togglePick(k)} className="w-4 h-4" />
                        <span className="text-xl">{it.emoji}</span>
                        <span className="flex-1 text-sm">{it.name}{dup && <span className="text-rose-400 text-xs ml-1">(이미 있음)</span>}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{fmt(it.price)}{klass.currency} · {it.qty}개</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={addPresets} disabled={adding || !picked.size} className={btn + ' bg-amber-500 hover:bg-amber-600 w-full text-lg'}>
              {adding ? '담는 중...' : `🛒 선택한 ${picked.size}개 상품 등록하기`}
            </button>
          </div>
        </div>
      )}
      <form onSubmit={add} className={card + ' flex flex-wrap items-end gap-3'}>
        <div>
          <label className="text-xs text-gray-400 block">이모지</label>
          <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className={input + ' w-16 text-center text-xl'} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-400 block">상품 이름</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 자리 바꾸기 이용권" className={input + ' w-full'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block">가격</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={input + ' w-24'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block">수량</label>
          <input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className={input + ' w-20'} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-400 block">이미지 URL (선택)</label>
          <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." className={input + ' w-full'} />
        </div>
        <button className={btn + ' bg-amber-500 hover:bg-amber-600'}>+ 상품 등록</button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => <ProductCard key={p.id} p={p} klass={klass} />)}
        {!products.length && <div className="text-gray-400 col-span-full text-center py-8">등록된 상품이 없어요.</div>}
      </div>
    </div>
  );
}

function ProductCard({ p, klass }) {
  const [price, setPrice] = useState(p.price);
  const [qty, setQty] = useState(p.qty);
  const ref = doc(db, 'classes', klass.id, 'products', p.id);
  const dirty = Number(price) !== p.price || Number(qty) !== p.qty;

  return (
    <div className="bg-white rounded-3xl shadow p-5">
      <div className="flex items-center gap-3 mb-3">
        {p.imageUrl
          ? <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
          : <div className="text-4xl">{p.emoji}</div>}
        <div>
          <div className="text-lg">{p.name}</div>
          <div className={`text-sm ${p.qty > 0 ? 'text-gray-400' : 'text-rose-500'}`}>
            {p.qty > 0 ? `남은 수량 ${p.qty}개` : '품절'}
          </div>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="text-xs text-gray-400 block">가격</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={input + ' w-20'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block">수량</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={input + ' w-16'} />
        </div>
        <button
          disabled={!dirty}
          onClick={() => updateDoc(ref, { price: Number(price), qty: Number(qty) })}
          className={btn + ' bg-indigo-400 hover:bg-indigo-500 text-sm'}
        >
          저장
        </button>
        <button
          onClick={() => confirm(`'${p.name}' 상품을 삭제할까요?`) && deleteDoc(ref)}
          className="ml-auto text-gray-300 hover:text-rose-500 text-xl"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

/* ---------- 구매 알림 ---------- */
function AlertsTab({ klass }) {
  const [purchases, setPurchases] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'purchases'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'paymentRequests'), orderBy('createdAtMs', 'desc'));
    return onSnapshot(q, (snap) => setPaymentRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const approvePaymentRequest = async (request) => {
    if (busyId) return;
    setBusyId(request.id);
    try {
      const requestRef = doc(db, 'classes', klass.id, 'paymentRequests', request.id);
      const studentRef = doc(db, 'classes', klass.id, 'students', request.studentId);
      let paid = 0;
      await runTransaction(db, async (tx) => {
        const requestSnap = await tx.get(requestRef);
        const studentSnap = await tx.get(studentRef);
        if (!requestSnap.exists() || requestSnap.data()?.status !== 'pending') throw new Error('이미 처리된 지급요청이에요.');
        if (!studentSnap.exists()) throw new Error('학생 계정을 찾지 못했어요.');
        const amount = Math.floor(Number(requestSnap.data()?.amount) || 0);
        if (amount < 1) throw new Error('지급 금액이 올바르지 않아요.');
        const student = studentSnap.data() || {};
        paid = amount;
        tx.update(studentRef, { cash: (Number(student.cash) || 0) + amount });
        tx.update(requestRef, { status: 'approved', approvedAt: Date.now(), paidAmount: amount });
      });
      setMsg(`✅ ${request.studentName || '학생'}에게 ${fmt(paid)}${klass.currency}를 지급했어요.`);
      window.setTimeout(() => setMsg(''), 3500);
    } catch (error) {
      setMsg(`지급 실패: ${error.message}`);
      window.setTimeout(() => setMsg(''), 3500);
    } finally {
      setBusyId('');
    }
  };

  const rejectPaymentRequest = async (request) => {
    if (busyId || !confirm(`${request.studentName || '학생'} 학생의 지급요청을 반려할까요?`)) return;
    setBusyId(request.id);
    try {
      await updateDoc(doc(db, 'classes', klass.id, 'paymentRequests', request.id), { status: 'rejected', rejectedAt: Date.now() });
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className={card}>
      <h3 className="mb-4 text-xl">🔔 알림·지급요청</h3>
      {msg && <div className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{msg}</div>}
      <div className="mb-5 space-y-2">
        {paymentRequests.map((request) => (
          <div key={request.id} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${request.status === 'pending' ? 'border-2 border-sky-200 bg-sky-50' : 'bg-gray-50 text-gray-400'}`}>
            <span className="text-2xl">🧾</span>
            <div className="min-w-0 flex-1"><b>{request.studentName}</b> 학생의 지급요청 <span className="ml-1 text-sm text-gray-500">{fmt(request.amount)} {klass.currency}</span><p className="truncate text-sm text-gray-500">이유: {request.reason}</p></div>
            {request.status === 'pending' ? (
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => approvePaymentRequest(request)} disabled={busyId === request.id} className={btn + ' bg-emerald-500 hover:bg-emerald-600 text-sm'}>✅ 확인하고 지급</button>
                <button onClick={() => rejectPaymentRequest(request)} disabled={busyId === request.id} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 disabled:opacity-40">반려</button>
              </div>
            ) : <span className="shrink-0 text-sm">{request.status === 'approved' ? '지급 완료' : '반려됨'}</span>}
          </div>
        ))}
        {!paymentRequests.length && <div className="py-2 text-center text-sm text-gray-400">지급요청이 없어요.</div>}
      </div>
      <h4 className="mb-3 text-lg text-gray-700">🛒 학생 구매 알림</h4>
      <div className="space-y-2">
        {purchases.map((o) => (
          <div
            key={o.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
              o.status === 'pending' ? 'bg-amber-50 border-2 border-amber-200' : 'bg-gray-50 text-gray-400'
            }`}
          >
            <span className="text-2xl">{o.emoji || '🎁'}</span>
            <div className="flex-1">
              <b>{o.studentName}</b> 학생이 <b>{o.productName}</b>을(를) 구매했어요
              <span className="text-sm text-gray-400 ml-2">{fmt(o.price)} {klass.currency}</span>
            </div>
            {o.status === 'pending' ? (
              <button
                onClick={() => updateDoc(doc(db, 'classes', klass.id, 'purchases', o.id), { status: 'done' })}
                className={btn + ' bg-emerald-500 hover:bg-emerald-600 text-sm'}
              >
                ✅ 지급 완료
              </button>
            ) : (
              <span className="text-sm">지급 완료</span>
            )}
          </div>
        ))}
        {!purchases.length && <div className="text-gray-400 text-center py-8">아직 구매 내역이 없어요.</div>}
      </div>
    </div>
  );
}

/* ---------- 주식 관리 (시뮬레이션 · 시장 전체가 문서 1개) ---------- */
function StocksTab({ klass }) {
  const [market, setMarket] = useState(undefined); // undefined=불러오는 중, null=시장 없음
  const [autoMode, setAutoMode] = useState(null); // null | random | real
  const [filter, setFilter] = useState('ALL');
  const [edit, setEdit] = useState(null);          // 편집 중인 종목
  const [editPrice, setEditPrice] = useState('');
  const [cName, setCName] = useState('');
  const [cPrice, setCPrice] = useState('');
  const [msg, setMsg] = useState('');
  const [pulling, setPulling] = useState(false);
  const timer = useRef(null);
  const migrated = useRef(false);

  const mref = doc(db, ...MARKET_PATH(klass.id));
  const limit = normalizedTickLimit(klass.tickLimit ?? DEFAULT_TICK_LIMIT);
  const used = usedTicks(market);
  const left = Math.max(0, limit - used);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  useEffect(() => {
    migrated.current = false;
    return onSnapshot(mref, (snap) => setMarket(snap.exists() ? snap.data() : null));
  }, [klass.id]);

  // 예전 구조(종목마다 문서 1개)가 남아 있으면 새 구조로 자동 이전
  useEffect(() => {
    if (market !== null || migrated.current) return;
    migrated.current = true;
    (async () => {
      const old = await getDocs(collection(db, 'classes', klass.id, 'stocks'));
      if (old.empty) return;
      const stocks = old.docs.map((d) => {
        const s = d.data();
        return {
          symbol: d.id, name: s.name, market: s.market,
          price: s.price, prevClose: s.prevClose ?? s.price,
          history: s.history || [s.price],
        };
      });
      await setDoc(mref, { stocks, tickCount: 0, tickDate: todayKey(), updatedAt: Date.now() });
      const batch = writeBatch(db);
      old.docs.forEach((d) => batch.delete(d.ref)); // 옛 문서 정리
      await batch.commit();
      flash('✅ 주식 데이터를 새 구조로 옮겼어요! (데이터 사용량 약 1/20로 절약)');
    })();
  }, [market, klass.id]);

  // 기존 20종 시장을 유지하면서 새 한국·미국 기본 종목만 추가해요.
  useEffect(() => {
    if (!market?.stocks) return;
    const stocks = mergeSeedStocks(market.stocks);
    if (stocks.length === market.stocks.length) return;
    updateDoc(mref, { stocks, updatedAt: Date.now() })
      .then(() => flash(`📈 새 한국·미국 종목 ${stocks.length - market.stocks.length}개를 추가했어요!`))
      .catch((e) => flash('⚠️ 새 종목을 추가하지 못했어요: ' + e.message));
  }, [market?.stocks?.length, klass.id]);

  // 예약 시세 변동(아침 8:30 · 오후 3:00)이 밀려 있으면 적용
  useEffect(() => {
    if (market && pendingSchedule(market).length) applyScheduledTicks(klass.id);
  }, [market, klass.id]);

  const initMarket = () => setDoc(mref, makeInitialMarket());

  // 📡 수동으로 실제 주식 시세를 그대로 반영 (자동변동과 달리 하루 횟수는 차감하지 않아요)
  const pullReal = async () => {
    // 예전 축소 가격(삼성전자 70 등)을 쓰던 학급은 금액이 크게 바뀌므로 한 번 확인해요
    const old = (market.stocks || []).find((s) => s.market === 'KR');
    if (old && old.price < 5000 && !confirm(
      '실제 시세를 반영하면 한국 주식이 실제 원(₩) 가격으로 바뀝니다.\n' +
      `예: ${old.name} ${fmt(old.price)} → 수십만 원대\n\n` +
      '이미 주식을 산 학생은 평가금액이 크게 오를 수 있어요. 계속할까요?'
    )) return;
    setPulling(true);
    try {
      const { prices, fx, partial } = await fetchRealQuotes();
      await updateDoc(mref, {
        stocks: applyRealPrices(market.stocks || [], prices),
        ...(fx ? { fx } : {}),
        realAt: Date.now(),
        updatedAt: Date.now(),
      });
      const count = Object.keys(prices || {}).length;
      flash(`📡 실제 시세 ${count}개 종목을 반영했어요! ${fx ? `(환율 1$ = ${fmt(fx)}원)` : ''}${partial ? ' · 일부 종목은 다음 시도에 갱신돼요.' : ''}`);
    } catch (e) {
      flash('⚠️ ' + e.message + ' — 잠시 후 다시 시도해 주세요.');
    } finally {
      setPulling(false);
    }
  };

  // 랜덤 시세 변동 — 트랜잭션으로 하루 횟수를 정확히 차감
  const tick = async () => {
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(mref);
        if (!snap.exists()) throw new Error('시장이 아직 열리지 않았어요.');
        const m = snap.data();
        const today = todayKey();
        const u = m.tickDate === today ? (m.tickCount || 0) : 0;
        if (u >= limit) throw new Error(`오늘 시세 변동을 모두 사용했어요! (${limit}회) 내일 다시 할 수 있어요.`);
        tx.update(mref, {
          stocks: (m.stocks || []).map((s) => advance(s)),
          tickCount: u + 1,
          tickDate: today,
          updatedAt: Date.now(),
        });
      });
    } catch (e) {
      flash('⚠️ ' + e.message);
      setAutoMode(null);
    }
  };

  // 실제 시세 자동 변동 — 실제 시세를 성공적으로 가져온 경우에만 하루 횟수를 차감
  const tickReal = async () => {
    if (pulling) return;
    setPulling(true);
    try {
      const { prices, fx, partial } = await fetchRealQuotes();
      let count = 0;
      let nextUsed = used + 1;
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(mref);
        if (!snap.exists()) throw new Error('시장이 아직 열리지 않았어요.');
        const m = snap.data();
        const today = todayKey();
        const u = m.tickDate === today ? (m.tickCount || 0) : 0;
        if (u >= limit) throw new Error(`오늘 시세 변동을 모두 사용했어요! (${limit}회) 내일 다시 할 수 있어요.`);
        nextUsed = u + 1;
        const nextStocks = (m.stocks || []).map((stock) => {
          const price = prices?.[stock.symbol];
          return price > 0 ? advance(stock, price) : stock;
        });
        count = Object.keys(prices || {}).length;
        tx.update(mref, {
          stocks: nextStocks,
          ...(fx ? { fx } : {}),
          realAt: Date.now(),
          tickCount: u + 1,
          tickDate: today,
          updatedAt: Date.now(),
        });
      });
      flash(`📡 실제 시세 자동변동 완료 · ${count}개 종목 반영 · 오늘 ${nextUsed}/${limit}회${partial ? ' · 일부 종목은 다음 시도에 갱신돼요.' : ''}`);
    } catch (e) {
      flash('⚠️ 실제 시세 자동변동 실패: ' + e.message);
      setAutoMode(null);
    } finally {
      setPulling(false);
    }
  };

  const toggleAuto = (mode) => {
    if (pulling) return flash('⏳ 시세를 불러오는 중에는 자동 모드를 바꿀 수 없어요.');
    setAutoMode((current) => current === mode ? null : mode);
  };

  // 자동 변동: 1분 59초 간격, 남은 횟수가 0이면 스스로 꺼짐
  useEffect(() => {
    if (!autoMode) return;
    if (left <= 0) { setAutoMode(null); flash('오늘 횟수를 다 써서 자동 변동을 껐어요.'); return; }
    const run = autoMode === 'real' ? tickReal : tick;
    timer.current = setInterval(run, AUTO_TICK_MS);
    return () => clearInterval(timer.current);
  }, [autoMode, left <= 0, klass.id]);

  const addCustom = async (e) => {
    e.preventDefault();
    const name = cName.trim();
    const price = Math.max(1, Math.floor(Number(cPrice)));
    if (!name || !price) return flash('종목 이름과 시작 가격을 모두 입력해 주세요.');
    await updateDoc(mref, {
      stocks: [...market.stocks, makeCustomStock(name, price)],
      updatedAt: Date.now(),
    });
    setCName(''); setCPrice('');
    flash(`🏫 '${name}' 종목을 만들었어요!`);
  };

  const savePrice = async () => {
    const p = Math.max(1, Math.floor(Number(editPrice)));
    if (!p) return;
    await updateDoc(mref, {
      stocks: market.stocks.map((s) => (s.symbol === edit.symbol ? advance(s, p) : s)),
      updatedAt: Date.now(),
    });
    setEdit(null);
    flash('💰 가격을 바꿨어요! 학생 화면에 바로 반영돼요.');
  };

  const delStock = async () => {
    if (!confirm(`'${edit.name}' 종목을 없앨까요?\n이 종목을 가진 학생의 평가액에서도 사라져요.`)) return;
    await updateDoc(mref, {
      stocks: market.stocks.filter((s) => s.symbol !== edit.symbol),
      updatedAt: Date.now(),
    });
    setEdit(null);
  };

  if (market === undefined) return <div className={card}>불러오는 중...</div>;

  if (market === null) {
    return (
      <div className={card + ' text-center py-10'}>
        <p className="text-gray-500 mb-4">
          아직 주식 시장이 열리지 않았어요.<br />
          한국 대표주 20개 + 미국 대표주 20개로 시장을 열어 보세요!
        </p>
        <button onClick={initMarket} className={btn + ' bg-indigo-500 hover:bg-indigo-600 text-lg'}>📈 주식 시장 열기</button>
        {msg && <p className="mt-4 text-indigo-600">{msg}</p>}
      </div>
    );
  }

  const list = (market.stocks || []).filter((s) => filter === 'ALL' || s.market === filter);
  const customCount = (market.stocks || []).filter((s) => s.market === 'CUSTOM').length;
  const stockPriceLabels = (stock) => {
    const price = Math.max(0, Number(stock.price) || 0);
    const fx = Number(market.fx) || DEFAULT_FX;
    const kpu = Number(klass.krwPerUnit) || DEFAULT_KRW_PER_UNIT;
    const actual = stock.market === 'US'
      ? `$${Math.floor(price).toLocaleString('en-US')}`
      : stock.market === 'KR'
        ? `${fmt(Math.floor(price))}원`
        : `${fmt(Math.floor(price))}${klass.currency}`;
    const classValue = stock.market === 'US'
      ? Math.floor((price * fx) / kpu)
      : stock.market === 'KR'
        ? Math.floor(price / kpu)
        : Math.floor(price);
    return { actual, classValue };
  };

  return (
    <div className="space-y-4">
      {/* 시세 변동 + 남은 횟수 */}
      <div className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl">📈 우리 반 주식 시장</h3>
          <button
            onClick={pullReal}
            disabled={pulling}
            className={btn + ' bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-lg'}
          >
            {pulling ? '불러오는 중...' : '📡 실제 시세 반영 (수동)'}
          </button>
          <button
            onClick={tick}
            disabled={left <= 0}
            className={btn + ' bg-indigo-400 hover:bg-indigo-500'}
          >
            🎲 랜덤 변동
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl tabular-nums ${
              left === 0 ? 'bg-rose-100 text-rose-600' : left <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              오늘 {used} / {limit}회 사용
            </span>
            <span className="text-sm text-gray-400">{left > 0 ? `${left}회 남음` : '내일 다시 충전돼요'}</span>
          </div>
        </div>
        {/* 사용량 막대 */}
        <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${left === 0 ? 'bg-rose-400' : left <= 3 ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-indigo-700">⏱️ 자동변동</span>
            <button
              type="button"
              onClick={() => toggleAuto('real')}
              disabled={left <= 0}
              className={`rounded-xl px-3 py-2 text-sm transition disabled:opacity-40 ${autoMode === 'real' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
            >
              {autoMode === 'real' ? '⏹ 실제 시세 자동변동 중' : '📡 실제 시세 자동변동'}
            </button>
            <button
              type="button"
              onClick={() => toggleAuto('random')}
              disabled={left <= 0}
              className={`rounded-xl px-3 py-2 text-sm transition disabled:opacity-40 ${autoMode === 'random' ? 'bg-violet-600 text-white shadow' : 'bg-white text-violet-600 border border-violet-200 hover:bg-violet-50'}`}
            >
              {autoMode === 'random' ? '⏹ 랜덤 자동변동 중' : '🎲 랜덤 자동변동'}
            </button>
            <span className="text-xs text-indigo-500">1분 59초마다 실행 · 이 화면이 켜져 있는 동안 · 두 모드 모두 1회 차감</span>
          </div>
        </div>
        {msg && <div className="mt-3 text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">{msg}</div>}
        <p className="text-xs text-gray-400 mt-2">
          📡 <b>실제 시세 반영</b>은 진짜 주식 가격을 그대로 가져와요 — 한국 주식은 <b>원(₩)</b>, 미국 주식은 <b>달러($)</b> 단위 그대로예요.
          수동 반영은 횟수를 차감하지 않고, 아래 자동변동 버튼만 횟수를 차감해요.
          {market?.realAt && (
            <b className="text-blue-500"> (마지막 반영: {new Date(market.realAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })})</b>
          )}
          <br />
          ⏰ 버튼을 누르지 않아도 <b>{SCHEDULE_LABEL}</b>에 실제 시세로 저절로 갱신돼요.
          🎲 랜덤 변동은 하루 횟수 안에서만 쓸 수 있어요 (⚙️설정에서 변경). 자동변동은 실제 시세·랜덤 모드 모두 실행할 때마다 1회씩 차감돼요.
        </p>
      </div>

      {/* 우리 반 종목 만들기 */}
      <form onSubmit={addCustom} className={card + ' flex flex-wrap items-end gap-3'}>
        <div>
          <h3 className="text-lg">🏫 우리 반 종목 만들기</h3>
          <p className="text-xs text-gray-400">예: 급식왕 주식회사, 3반 문구점 — 우리 반만의 종목을 만들어요 ({customCount}개)</p>
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-400 block">종목 이름</label>
          <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="예: 급식왕 주식회사" className={input + ' w-full'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block">시작 가격</label>
          <input type="number" value={cPrice} onChange={(e) => setCPrice(e.target.value)} placeholder="100" className={input + ' w-28'} />
        </div>
        <button className={btn + ' bg-teal-500 hover:bg-teal-600'}>+ 종목 추가</button>
      </form>

      {/* 종목 목록 */}
      <div className={card}>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[['ALL', '전체'], ['KR', '🇰🇷 한국'], ['US', '🇺🇸 미국'], ['CUSTOM', '🏫 우리반']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1 rounded-xl text-sm ${filter === id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400 self-center">종목을 누르면 가격을 직접 바꿀 수 있어요 ✏️</span>
        </div>
        <div className="grid md:grid-cols-2 gap-x-8">
          {list.map((s) => {
            const pct = changePct(s);
            const prices = stockPriceLabels(s);
            return (
              <button
                key={s.symbol}
                onClick={() => { setEdit(s); setEditPrice(String(s.price)); }}
                className="flex items-center gap-2 border-b border-gray-100 py-2 text-left hover:bg-indigo-50/50 rounded-lg px-1"
              >
                <span>{MARKET_LABEL[s.market] || '🏫'}</span>
                <span className="flex-1 min-w-0 truncate">{s.name}</span>
                <span className="text-right leading-tight tabular-nums whitespace-nowrap">
                  <span className="block">{prices.actual}</span>
                  <span className="block text-[11px] text-indigo-500">({fmt(prices.classValue)} {klass.currency})</span>
                </span>
                <span className={`w-20 text-right tabular-nums ${pct > 0 ? 'text-red-500' : pct < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                  {pct > 0 ? '▲' : pct < 0 ? '▼' : '−'} {Math.abs(pct).toFixed(1)}%
                </span>
              </button>
            );
          })}
          {!list.length && <div className="text-gray-400 py-6 col-span-full text-center">이 분류에는 종목이 없어요.</div>}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          * 교육용 모의 시세입니다. 실제 주가와 다르며, 여기서 시세를 바꾸면 모든 학생 화면에 실시간 반영돼요.
        </p>
      </div>

      {/* 가격 편집 모달 */}
      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEdit(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl">{MARKET_LABEL[edit.market] || '🏫'} {edit.name}</h3>
            <p className="text-sm text-gray-400">현재 가격 {stockPriceLabels(edit).actual} ({fmt(stockPriceLabels(edit).classValue)} {klass.currency})</p>
            <div>
              <label className="text-xs text-gray-400 block">새 가격</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className={input + ' w-full text-xl text-center'}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[-20, -10, +10, +20].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEditPrice(String(Math.max(1, Math.round(edit.price * (1 + p / 100)))))}
                  className={`flex-1 rounded-xl py-2 text-sm ${p > 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}
                >
                  {p > 0 ? '+' : ''}{p}%
                </button>
              ))}
            </div>
            <button onClick={savePrice} className={btn + ' bg-indigo-500 hover:bg-indigo-600 w-full text-lg'}>💰 가격 바꾸기</button>
            {edit.market === 'CUSTOM' && (
              <button onClick={delStock} className="w-full text-sm text-rose-500 underline">이 종목 없애기</button>
            )}
            <button onClick={() => setEdit(null)} className="w-full text-sm text-gray-400">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 학급 설정: 화폐 단위 / 월급 / 이율 ---------- */
function SettingsTab({ klass }) {
  const init = () => ({
    name: klass.name, currency: klass.currency, salary: klass.salary,
    depositRate: klass.depositRate, savingsRate: klass.savingsRate,
    loanRate: klass.loanRate ?? 10, loanLimit: klass.loanLimit ?? 1000,
    tickLimit: normalizedTickLimit(klass.tickLimit ?? DEFAULT_TICK_LIMIT),
    heroBattleLimit: klass.heroBattleLimit ?? 10,
    heroWinReward: klass.heroWinReward ?? 10,
    heroLoseReward: klass.heroLoseReward ?? 0,
    priceInflationMode: klass.priceInflationMode ?? PRICE_MODE_UNIT,
    priceInflationValue: klass.priceInflationValue ?? 0,
    taxRate: klass.taxRate ?? 10,
    ...Object.fromEntries(TAX_PARTS.map(({ key, field }) => [
      field,
      key === 'stockBuy' ? 0 : key === 'stockSell' ? 5 : klass[field] ?? klass.taxRate ?? 10,
    ])),
    krwPerUnit: klass.krwPerUnit ?? DEFAULT_KRW_PER_UNIT,
  });
  const [form, setForm] = useState(init);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(init()); }, [klass.id]);

  const save = async (e) => {
    e.preventDefault();
    const taxValues = Object.fromEntries(TAX_PARTS.map(({ key, field }) => [
      field,
      key === 'stockBuy' ? 0 : key === 'stockSell' ? 5 : Math.max(0, Math.min(100, Number(form[field]) || 0)),
    ]));
    await updateDoc(doc(db, 'classes', klass.id), {
      name: form.name.trim() || klass.name,
      currency: form.currency.trim() || '포인트',
      salary: Number(form.salary) || 0,
      depositRate: Number(form.depositRate) || 0,
      savingsRate: Number(form.savingsRate) || 0,
      loanRate: Math.max(0, Math.min(1000, Number(form.loanRate) || 0)),
      loanLimit: Math.max(0, Math.floor(Number(form.loanLimit) || 0)),
      tickLimit: Math.max(1, Math.min(MAX_TICK_LIMIT, Number(form.tickLimit) || DEFAULT_TICK_LIMIT)),
      heroBattleLimit: Math.max(1, Math.min(100, Number(form.heroBattleLimit) || 10)),
      heroWinReward: Math.max(0, Math.min(100000, Number(form.heroWinReward) || 0)),
      heroLoseReward: Math.max(0, Math.min(100000, Number(form.heroLoseReward) || 0)),
      priceInflationMode: form.priceInflationMode === PRICE_MODE_PERCENT ? PRICE_MODE_PERCENT : PRICE_MODE_UNIT,
      priceInflationValue: Math.max(0, Math.min(form.priceInflationMode === PRICE_MODE_PERCENT ? 1000 : 1000000, Number(form.priceInflationValue) || 0)),
      taxRate: taxValues.taxSalaryRate,
      ...taxValues,
      krwPerUnit: Math.max(0.01, Number(form.krwPerUnit) || DEFAULT_KRW_PER_UNIT),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (label, key, type = 'text', hint = '') => (
    <div>
      <label className="text-sm text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={input + ' w-full'}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className={card + ' w-full space-y-4'}>
      <h3 className="text-xl">⚙️ 학급 설정</h3>
      {field('학급 이름', 'name')}
      {field('화폐 단위', 'currency', 'text', '예: 미소, 달란트, 별, 포인트 — 자유롭게 정해요.')}
      {field(
        `화폐 가치 (1 ${form.currency || '포인트'} = ? 원)`, 'krwPerUnit', 'number',
        `기본 1 (실제 돈과 1:1). 100으로 하면 1${form.currency || '포인트'} = 100원이 되어, ` +
        `삼성전자 262,500원짜리 주식이 ${fmt(Math.round(262500 / (Number(form.krwPerUnit) || 1)))} ${form.currency || '포인트'}가 돼요. ` +
        '숫자를 크게 할수록 주식이 저렴해집니다.'
      )}
      {field('월급 금액', 'salary', 'number', '월급 지급 버튼을 누를 때 1인당 지급되는 금액이에요.')}
      {field('예금 이율 (주당 %)', 'depositRate', 'number', '학생이 예금에 넣어둔 돈에 7일마다 붙는 이자예요.')}
      {field(
        '적금 기본 이율 (7일 기준, 주당 %)', 'savingsRate', 'number',
        `오래 맡길수록 1%p씩 우대해요 → 7일 ${form.savingsRate}% · 14일 ${Number(form.savingsRate) + 1}% · 21일 ${Number(form.savingsRate) + 2}%`
      )}
      {field('대출 이율 (7일 기준, %)', 'loanRate', 'number', '대출일로부터 7일 뒤 원금에 붙는 이자율이에요.')}
      {field('학생 1명 대출 한도', 'loanLimit', 'number', '상환하지 않은 대출 원금의 합이 이 한도를 넘지 않도록 해요.')}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
        <div>
          <h4 className="font-bold text-emerald-700">🏛️ 거래별 공동기금 세율</h4>
          <p className="text-xs text-emerald-600 mt-1">거래 금액 × 세율을 세금으로 떼어 공동기금에 모아요. 소수점 이하는 버립니다. 기존 학급은 기존 세율을 모든 항목의 기본값으로 사용해요.</p>
        </div>
        {TAX_PARTS.map(({ field: taxField, label, description }) => (
          <div key={taxField} className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2">
            <div className="flex-1 min-w-0">
              <label className="text-sm text-gray-600 block">{label} 세율</label>
              <span className="text-[11px] text-gray-400">{description}</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              value={form[taxField]}
              onChange={(e) => setForm({ ...form, [taxField]: e.target.value })}
              disabled={taxField === 'taxStockBuyRate' || taxField === 'taxStockSellRate'}
              readOnly={taxField === 'taxStockBuyRate' || taxField === 'taxStockSellRate'}
              className={input + ' w-24 text-right'}
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        ))}
      </div>
      {field(
        '하루 시세 변동 횟수', 'tickLimit', 'number',
         '주식 시세를 하루에 몇 번까지 바꿀 수 있는지 정해요. (기본 25회)'
      )}
      {field('용사 전투 하루 도전 횟수', 'heroBattleLimit', 'number', '학생 한 명이 하루에 용사 전투를 도전할 수 있는 횟수예요. 기본 10회.')}
      {field('용사 전투 1구간 승리 보상', 'heroWinReward', 'number', '1~10단계의 일반 몬스터 승리 보상이에요. 다음 구간마다 보상이 올라가고, 보스는 해당 구간 보상의 10배를 지급해요. 기본 10.')}
      {field('용사 전투 패배 보상', 'heroLoseReward', 'number', '용사가 졌을 때 지급할 학급화폐예요. 기본 0.')}
      <div>
        <label className="text-sm text-gray-500 block mb-1">상점·내 공간 물가 상승 방식</label>
        <select
          value={form.priceInflationMode}
          onChange={(e) => setForm({ ...form, priceInflationMode: e.target.value })}
          className={input + ' w-full bg-white'}
        >
          <option value={PRICE_MODE_UNIT}>금액 단위로 올리기</option>
          <option value={PRICE_MODE_PERCENT}>퍼센트로 올리기</option>
        </select>
      </div>
      {field(
        form.priceInflationMode === PRICE_MODE_PERCENT ? '물가 상승률 (%)' : `아이템당 추가 금액 (${form.currency || '포인트'})`,
        'priceInflationValue', 'number',
        `현재 설정: ${pricePolicyLabel(form, form.currency || '포인트')} · 학급 상점, 용사 상점, 내 공간 아이템에 적용돼요. 기존 구매·보유 데이터는 바뀌지 않아요.`
      )}
      <button className={btn + ' bg-indigo-500 hover:bg-indigo-600 text-lg w-full'}>저장하기</button>
      {saved && <p className="text-emerald-600 text-center">✅ 저장되었어요!</p>}
    </form>
  );
}

/* ---------- 🔒 학생별 비밀번호 관리 ---------- */
function PinManager({ klass }) {
  const [students, setStudents] = useState([]);
  const [edit, setEdit] = useState({});   // studentId → 입력 중인 값
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'students'), orderBy('name'));
    return onSnapshot(q, (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent)));
  }, [klass.id]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const savePin = async (s) => {
    const v = String(edit[s.id] ?? '').replace(/\D/g, '').slice(0, 4);
    if (v.length !== 4) return flash('숫자 4자리로 입력해 주세요.');
    await updateDoc(doc(db, 'classes', klass.id, 'students', s.id), { pin: v });
    setEdit((e) => ({ ...e, [s.id]: undefined }));
    flash(`✅ ${s.name} 학생의 비밀번호를 ${v}로 바꿨어요.`);
  };

  return (
    <div className={card + ' w-full space-y-3'}>
      <div className="flex items-center gap-2">
        <h3 className="text-xl">🔒 학생 비밀번호</h3>
        <button
          onClick={() => setShow((v) => !v)}
          className="ml-auto text-sm rounded-xl px-3 py-1 bg-gray-100 text-gray-600"
        >
          {show ? '🙈 가리기' : '👀 보기'}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        학생이 처음 입장할 때 스스로 정한 4자리 비밀번호예요. 잊어버린 학생이 있으면 여기서 바꿔 주세요.
      </p>
      {msg && <div className="bg-indigo-50 text-indigo-700 rounded-xl px-3 py-2 text-sm">{msg}</div>}

      {!students.length ? (
        <p className="text-gray-400 text-center py-4">아직 입장한 학생이 없어요.</p>
      ) : (
        <div className="space-y-1.5">
          {students.map((s) => {
            const editing = edit[s.id] !== undefined;
            return (
              <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-lg">{s.avatar?.base || '🙂'}</span>
                <span className="flex-1 text-sm">{s.name}</span>
                {editing ? (
                  <>
                    <input
                      value={edit[s.id]}
                      onChange={(e) => setEdit({ ...edit, [s.id]: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      className="w-20 rounded-lg border-2 border-indigo-300 px-2 py-1 text-center tracking-widest outline-none"
                    />
                    <button onClick={() => savePin(s)} className="text-sm rounded-lg px-2.5 py-1 bg-indigo-500 text-white">저장</button>
                    <button onClick={() => setEdit((e) => ({ ...e, [s.id]: undefined }))} className="text-gray-400 text-sm">취소</button>
                  </>
                ) : (
                  <>
                    <span className="tabular-nums tracking-widest text-gray-600 w-14 text-center">
                      {s.pin ? (show ? s.pin : '••••') : <span className="text-gray-300 text-xs">미설정</span>}
                    </span>
                    <button
                      onClick={() => setEdit({ ...edit, [s.id]: s.pin || '' })}
                      className="text-sm rounded-lg px-2.5 py-1 bg-white border border-gray-200 text-gray-600"
                    >
                      바꾸기
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
