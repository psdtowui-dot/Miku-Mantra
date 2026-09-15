'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function CrudPage({ title, endpoint, fields, listRender }) {
  const [list, setList] = useState([]); const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(fields.reduce((a, f) => ({ ...a, [f.k]: f.default || '' }), {}));
  const load = async () => { setLoading(true); const r = await fetch(`/api/admin/${endpoint}`, { credentials: 'include', cache: 'no-store' }); const d = await r.json(); setList(d[endpoint] || []); setLoading(false); };
  useEffect(() => { load(); }, []);
  const add = async () => { const r = await fetch(`/api/admin/${endpoint}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (r.ok) { toast.success('Added'); setForm(fields.reduce((a, f) => ({ ...a, [f.k]: f.default || '' }), {})); load(); } };
  const del = async (id) => { if (!confirm('Delete?')) return; const r = await fetch(`/api/admin/${endpoint}/${id}`, { method: 'DELETE', credentials: 'include' }); if (r.ok) { toast.success('Deleted'); load(); } };
  return (
    <div>
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">{title}</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8" />
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 xs:p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{fields.map(f => (<div key={f.k}><label className="text-[10px] tracking-widest uppercase text-neutral-500">{f.label}</label>{f.type === 'textarea' ? <textarea value={form[f.k] || ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]" /> : f.type === 'checkbox' ? <label className="flex items-center gap-2 mt-2 select-none cursor-pointer"><input type="checkbox" checked={!!form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.checked })} className="accent-[#9C6B30] h-4 w-4 rounded" /></label> : <input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => setForm({ ...form, [f.k]: f.type === 'number' ? +e.target.value : e.target.value })} className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]" />}</div>))}</div>
        <button onClick={add} className="mt-4 flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2 text-[11px] tracking-widest uppercase rounded hover:bg-[#9C6B30] transition-colors w-full sm:w-auto"><Plus size={14} /> Add</button>
      </div>
      {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin inline text-[#9C6B30]" /></div> : (
        <div className="bg-white rounded-xl border border-neutral-200 divide-y">{list.length === 0 && <div className="p-8 text-center text-neutral-400">No items yet</div>}{list.map(item => (<div key={item.id} className="p-3.5 xs:p-4 flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 hover:bg-neutral-50/50 transition-colors"><div className="min-w-0 flex-1">{listRender ? listRender(item) : <div>{item.name || item.code || item.title}</div>}</div><button onClick={() => del(item.id)} className="text-red-600 hover:text-red-800 p-1 self-end xs:self-center" title="Delete"><Trash2 size={14} /></button></div>))}</div>
      )}
    </div>
  );
}

export default CrudPage;
