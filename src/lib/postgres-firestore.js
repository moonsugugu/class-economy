const HTTP_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3100' : 'https://api.moonsunezip.com';
const WS_BASE = HTTP_BASE.replace(/^http/, 'ws');

const clean = (parts) => parts.flatMap((x) => x?.path ? [x.path] : [x]).filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
const refPath = (args) => args[0]?.path ? clean(args) : clean(args.slice(1));
const autoId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 20);
const getField = (obj, field) => field.split('.').reduce((v, k) => v?.[k], obj);

export const getFirestore = () => ({ type: 'postgres-firestore' });
export const collection = (...args) => ({ type: 'collection', path: refPath(args), id: String(args.at(-1)) });
export const doc = (...args) => {
  const base = refPath(args);
  const path = args.length === 1 && args[0]?.type === 'collection' ? `${base}/${autoId()}` : base;
  return { type: 'doc', path, id: path.split('/').at(-1) };
};
export const where = (field, op, value) => ({ kind: 'where', field, op, value });
export const orderBy = (field, direction = 'asc') => ({ kind: 'orderBy', field, direction });
export const limit = (value) => ({ kind: 'limit', value });
export const query = (ref, ...constraints) => ({ type: 'query', path: ref.path, constraints });

class DocSnapshot {
  constructor(ref, record) { this.ref = ref; this.id = ref.id; this._record = record; this.version = record?.version ?? null; }
  exists() { return !!this._record; }
  data() { return this._record?.data; }
}
class QuerySnapshot {
  constructor(docs) { this.docs = docs; this.size = docs.length; this.empty = !docs.length; }
  forEach(fn) { this.docs.forEach(fn); }
}

async function request(path, options) {
  const response = await fetch(`${HTTP_BASE}${path}`, options);
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.error || `HTTP ${response.status}`), { status: response.status });
  return data;
}
export async function getDoc(ref) {
  try { return new DocSnapshot(ref, await request(`/v1/documents/doc?path=${encodeURIComponent(ref.path)}`)); }
  catch (e) { if (e.status === 404) return new DocSnapshot(ref, null); throw e; }
}
function matches(value, op, expected) {
  if (op === '==') return value === expected;
  if (op === '!=') return value !== expected;
  if (op === '<') return value < expected;
  if (op === '<=') return value <= expected;
  if (op === '>') return value > expected;
  if (op === '>=') return value >= expected;
  if (op === 'in') return expected.includes(value);
  if (op === 'array-contains') return Array.isArray(value) && value.includes(expected);
  return false;
}
export async function getDocs(target) {
  const records = await request(`/v1/documents/query?collection=${encodeURIComponent(target.path)}`);
  let docs = records.map((r) => new DocSnapshot({ type:'doc', path:r.path, id:r.id }, r));
  for (const c of target.constraints || []) {
    if (c.kind === 'where') docs = docs.filter((d) => matches(getField(d.data(), c.field), c.op, c.value));
    if (c.kind === 'orderBy') docs.sort((a,b) => {
      const av=getField(a.data(),c.field), bv=getField(b.data(),c.field);
      return (av === bv ? 0 : av == null ? 1 : bv == null ? -1 : av < bv ? -1 : 1) * (c.direction === 'desc' ? -1 : 1);
    });
    if (c.kind === 'limit') docs = docs.slice(0, c.value);
  }
  return new QuerySnapshot(docs);
}
const commit = (operations, reads = []) => {
  const requestId=crypto.randomUUID();
  return request('/v1/documents/commit', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ requestId, reads, operations }),
  });
};
export const setDoc = (ref, data, options={}) => commit([{ type:'set', path:ref.path, data, merge:!!options.merge }]);
export const updateDoc = (ref, data) => commit([{ type:'update', path:ref.path, data }]);
export const deleteDoc = (ref) => commit([{ type:'delete', path:ref.path }]);
export async function addDoc(ref, data) { const out=doc(ref); await setDoc(out,data); return out; }
export const serverTimestamp = () => ({ __op:'serverTimestamp' });
export const increment = (value) => ({ __op:'increment', value });
export const arrayUnion = (...values) => ({ __op:'arrayUnion', values });
export const arrayRemove = (...values) => ({ __op:'arrayRemove', values });
export const deleteField = () => ({ __op:'delete' });

export function writeBatch() {
  const operations=[];
  return {
    set(ref,data,options={}) { operations.push({type:'set',path:ref.path,data,merge:!!options.merge}); return this; },
    update(ref,data) { operations.push({type:'update',path:ref.path,data}); return this; },
    delete(ref) { operations.push({type:'delete',path:ref.path}); return this; },
    commit: () => commit(operations),
  };
}
export async function runTransaction(_db, handler) {
  for (let attempt=0; attempt<20; attempt++) {
    const reads=[], operations=[];
    const tx={
      async get(ref) { const snap=await getDoc(ref); reads.push({path:ref.path,version:snap.version}); return snap; },
      set(ref,data,options={}) { operations.push({type:'set',path:ref.path,data,merge:!!options.merge}); return tx; },
      update(ref,data) { operations.push({type:'update',path:ref.path,data}); return tx; },
      delete(ref) { operations.push({type:'delete',path:ref.path}); return tx; },
    };
    const result=await handler(tx);
    try { await commit(operations, reads); return result; }
    catch(e) {
      if(e.status !== 409 || attempt === 19) throw e;
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, 8 * (attempt + 1)) + Math.random() * 30));
    }
  }
}

export function onSnapshot(target, next, error) {
  let closed=false, timer, ws;
  const load=async()=>{ try { if(!closed) next(target.type==='doc' ? await getDoc(target) : await getDocs(target)); } catch(e) { error?.(e); } };
  const scope=target.path.split('/').slice(0,2).join('/');
  const connect=()=>{
    if(closed) return;
    ws=new WebSocket(`${WS_BASE}/v1/documents/realtime?scope=${encodeURIComponent(scope)}`);
    ws.onmessage=()=>{ clearTimeout(timer); timer=setTimeout(load,40); };
    ws.onclose=()=>{ if(!closed) timer=setTimeout(connect,1000); };
    ws.onerror=()=>ws.close();
  };
  load(); connect();
  return ()=>{ closed=true; clearTimeout(timer); ws?.close(); };
}
