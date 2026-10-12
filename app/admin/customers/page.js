'use client';
import { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

export default function AdminCustomers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');

  const load = async (query = search) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/customers?search=${encodeURIComponent(query)}`, { credentials: 'include', cache: 'no-store' });
      const d = await r.json();
      setList(d.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchVal);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Load when search changes
  useEffect(() => {
    load(search);
  }, [search]);

  return (
    <div>
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Customers</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8" />

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input 
          value={searchVal} 
          onChange={e => setSearchVal(e.target.value)} 
          placeholder="Search customers..." 
          className="w-full pl-9 pr-10 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all"
        />
        {searchVal && (
          <button 
            onClick={() => setSearchVal('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="animate-spin inline text-[#9C6B30]" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3 min-w-[110px]">Name</th>
                  <th className="text-left p-3 min-w-[130px]">Email</th>
                  <th className="text-left p-3 min-w-[100px]">Phone</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3 min-w-[90px]">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-400">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  list.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-3 font-medium text-neutral-900">{u.name}</td>
                      <td className="p-3">
                        <div className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none text-neutral-700" title={u.email}>
                          {u.email}
                        </div>
                      </td>
                      <td className="p-3 text-neutral-600">{u.phone || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs uppercase font-semibold ${u.role === 'admin' ? 'bg-[#FAF6EF] text-[#9C6B30]' : 'bg-neutral-100 text-neutral-700'}`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-neutral-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
