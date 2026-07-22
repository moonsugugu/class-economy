import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  collection, doc, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, getDocs, writeBatch,
  increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { fmt, makeClassCode } from '../../lib/util';
import { STOCK_SEED, nextPrice, changePct } from '../../lib/stocks';
import { SHOP_PRESETS } from '../../lib/shopPresets';
import SeatsTab from './SeatsTab.jsx';

const card = 'bg-white rounded-3xl shadow p-6';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 outline-none';
const btn = 'rounded-xl px-4 py-2 text-white shadow transition disabled:opacity-40';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { teacher, authReady, logoutTeacher } = useApp();
  const [classes, setClasses] = useState(null);
  const [classId, setClassId] = useState(() => localStorage.getItem('ce_teacher_class') || '');
  const [tab, setTab] = useState('students');
  const [pendingCount, setPendingCount] = useState(0);
  const [newClassName, setNewClassName] = useState('');

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

  if (!authReady) return <Center>불러오는 중...</Center>;
  if (!teacher) return <Navigate to="/" replace />;
  if (classes === null) return <Center>학급 정보를 불러오는 중...</Center>;

  const createClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    const ref = await addDoc(collection(db, 'classes'), {
      name,
      code: makeClassCode(),
      teacherUid: teacher.uid,
      currency: '미소',
      salary: 100,
      depositRate: 2,
      savingsRate: 5,
      createdAt: serverTimestamp(),
    });
    setNewClassName('');
    setClassId(ref.id);
  };

  const tabs = [
    ['students', '🧑‍🎓', '학생', 'from-emerald-400 to-teal-500'],
    ['shop', '🏪', '상점', 'from-amber-400 to-orange-500'],
    ['alerts', '🔔', pendingCount ? `알림 ${pendingCount}` : '알림', 'from-rose-400 to-pink-500'],
    ['stocks', '📈', '주식', 'from-blue-400 to-indigo-500'],
    ['seats', '🪑', '자리', 'from-teal-400 to-cyan-500'],
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
          {tab === 'seats' && <SeatsTab klass={klass} />}
          {tab === 'settings' && <SettingsTab klass={klass} />}
        </>
      )}
    </div>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-xl text-gray-400">{children}</div>;
}

/* ---------- 학생 관리: 월급 지급 / 상벌점 화폐 증감 ---------- */
function StudentsTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'students'), orderBy('name'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allSelected = students.length > 0 && selected.size === students.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  const targets = students.filter((s) => selected.has(s.id));

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const paySalary = async () => {
    if (!targets.length) return flash('먼저 학생을 선택해 주세요.');
    const batch = writeBatch(db);
    targets.forEach((s) => batch.update(doc(db, 'classes', klass.id, 'students', s.id), { cash: increment(klass.salary) }));
    await batch.commit();
    flash(`💰 ${targets.length}명에게 월급 ${fmt(klass.salary)}${klass.currency}씩 지급했어요!`);
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
    if (!confirm(`정말 '${s.name}' 학생을 삭제할까요? 자산이 모두 사라져요.`)) return;
    await deleteDoc(doc(db, 'classes', klass.id, 'students', s.id));
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
            💰 월급 지급 ({fmt(klass.salary)}{klass.currency})
          </button>
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
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-sm border-b">
              <th className="py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-5 h-5" /></th>
              <th>이름</th>
              <th className="text-right">현금</th>
              <th className="text-right">예금</th>
              <th className="text-right w-16"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-indigo-50/40">
                <td className="py-2"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-5 h-5" /></td>
                <td className="text-lg">{s.avatar?.base || '🙂'} {s.name}</td>
                <td className="text-right">{fmt(s.cash)} {klass.currency}</td>
                <td className="text-right text-gray-500">{fmt(s.deposit)} {klass.currency}</td>
                <td className="text-right">
                  <button onClick={() => removeStudent(s)} className="text-gray-300 hover:text-rose-500">🗑️</button>
                </td>
              </tr>
            ))}
            {!students.length && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">
                아직 학생이 없어요. 학생들에게 학급 코드 <b>{klass.code}</b>를 알려 주세요!
              </td></tr>
            )}
          </tbody>
        </table>
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

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'purchases'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  return (
    <div className={card}>
      <h3 className="text-xl mb-4">🔔 학생 구매 알림</h3>
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

/* ---------- 주식 관리 (시뮬레이션) ---------- */
function StocksTab({ klass }) {
  const [stocks, setStocks] = useState(null);
  const [auto, setAuto] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'stocks'), orderBy('market'));
    return onSnapshot(q, (snap) => setStocks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const initStocks = async () => {
    const batch = writeBatch(db);
    STOCK_SEED.forEach((s) => {
      batch.set(doc(db, 'classes', klass.id, 'stocks', s.symbol), {
        name: s.name, market: s.market, price: s.base, prevClose: s.base,
        history: [s.base], updatedAt: Date.now(),
      });
    });
    await batch.commit();
  };

  const tick = async () => {
    const snap = await getDocs(collection(db, 'classes', klass.id, 'stocks'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      const s = d.data();
      const p = nextPrice(s.price);
      batch.update(d.ref, {
        prevClose: s.price,
        price: p,
        history: [...(s.history || []).slice(-39), p],
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  };

  useEffect(() => {
    if (auto) timer.current = setInterval(tick, 45000);
    return () => clearInterval(timer.current);
  }, [auto, klass.id]);

  if (stocks === null) return <div className={card}>불러오는 중...</div>;

  if (!stocks.length) {
    return (
      <div className={card + ' text-center py-10'}>
        <p className="text-gray-500 mb-4">아직 주식 시장이 열리지 않았어요.<br />한국 대표주 10개 + 미국 대표주 10개로 시장을 열어 보세요!</p>
        <button onClick={initStocks} className={btn + ' bg-indigo-500 hover:bg-indigo-600 text-lg'}>📈 주식 시장 열기</button>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="text-xl">📈 모의 주식 시장</h3>
        <button onClick={tick} className={btn + ' bg-indigo-500 hover:bg-indigo-600'}>🎲 지금 시세 변동</button>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="w-5 h-5" />
          자동 변동 (45초마다, 이 화면이 켜져 있는 동안)
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-x-8">
        {stocks.map((s) => {
          const pct = changePct(s);
          return (
            <div key={s.id} className="flex items-center gap-2 border-b border-gray-100 py-2">
              <span>{s.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
              <span className="flex-1">{s.name}</span>
              <span className="tabular-nums">{fmt(s.price)} {klass.currency}</span>
              <span className={`w-20 text-right tabular-nums ${pct > 0 ? 'text-red-500' : pct < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                {pct > 0 ? '▲' : pct < 0 ? '▼' : '−'} {Math.abs(pct).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        * 교육용 모의 시세입니다. 실제 주가와 다르며, 시세는 이 대시보드에서 변동시킬 때 모든 학생 화면에 실시간 반영돼요.
      </p>
    </div>
  );
}

/* ---------- 학급 설정: 화폐 단위 / 월급 / 이율 ---------- */
function SettingsTab({ klass }) {
  const [form, setForm] = useState({
    name: klass.name, currency: klass.currency, salary: klass.salary,
    depositRate: klass.depositRate, savingsRate: klass.savingsRate,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: klass.name, currency: klass.currency, salary: klass.salary,
      depositRate: klass.depositRate, savingsRate: klass.savingsRate,
    });
  }, [klass.id]);

  const save = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, 'classes', klass.id), {
      name: form.name.trim() || klass.name,
      currency: form.currency.trim() || '포인트',
      salary: Number(form.salary) || 0,
      depositRate: Number(form.depositRate) || 0,
      savingsRate: Number(form.savingsRate) || 0,
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
    <form onSubmit={save} className={card + ' max-w-lg space-y-4'}>
      <h3 className="text-xl">⚙️ 학급 설정</h3>
      {field('학급 이름', 'name')}
      {field('화폐 단위', 'currency', 'text', '예: 미소, 달란트, 별, 포인트 — 자유롭게 정해요.')}
      {field('월급 금액', 'salary', 'number', '월급 지급 버튼을 누를 때 1인당 지급되는 금액이에요.')}
      {field('예금 이율 (주당 %)', 'depositRate', 'number', '학생이 예금에 넣어둔 돈에 7일마다 붙는 이자예요.')}
      {field('적금 이율 (주당 %)', 'savingsRate', 'number', '만기까지 돈을 묶어두는 적금에 적용되는 더 높은 이율이에요.')}
      <button className={btn + ' bg-indigo-500 hover:bg-indigo-600 text-lg w-full'}>저장하기</button>
      {saved && <p className="text-emerald-600 text-center">✅ 저장되었어요!</p>}
    </form>
  );
}
