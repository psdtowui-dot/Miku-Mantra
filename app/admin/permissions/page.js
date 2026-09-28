'use client';
import { useEffect, useState } from 'react';
import {
  Lock, Shield, Check, X, Search, Loader2, Info, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/permissions', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
        setRoles(data.roles || []);
      } else {
        toast.error('Failed to load permissions');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error fetching permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allGroups = ['ALL', ...Array.from(new Set(permissions.map(p => p.group)))];

  const filteredPermissions = permissions.filter(p => {
    const matchesGroup = selectedGroup === 'ALL' || p.group === selectedGroup;
    const matchesSearch = !searchVal.trim() ||
      p.label.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.key.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.description.toLowerCase().includes(searchVal.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  // Group the filtered permissions
  const grouped = filteredPermissions.reduce((acc, p) => {
    acc[p.group] = acc[p.group] || [];
    acc[p.group].push(p);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Permissions Matrix</div>
          <div className="gold-line w-12 mt-2 mb-2 sm:mb-4" />
          <p className="text-xs sm:text-sm text-neutral-500">
            Catalog of granular access control permissions and their assignment across system roles.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 xs:p-4 my-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search permissions by name, key, or description..."
              className="w-full pl-9 pr-10 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] transition-all"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
            {allGroups.map(grp => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedGroup === grp
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permission Matrix Content */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={32} />
          <p className="text-xs text-neutral-500 mt-2 font-mono">Loading permissions matrix...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupName, perms]) => (
            <div key={groupName} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#D4AF37]/20 flex items-center justify-center text-[#9C6B30]">
                    <Lock size={12} />
                  </div>
                  <h3 className="font-semibold text-neutral-900 text-sm tracking-wide">{groupName}</h3>
                </div>
                <span className="text-xs font-mono text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded">
                  {perms.length} permissions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50/50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="text-left p-3 min-w-[200px]">Permission</th>
                      <th className="text-left p-3 min-w-[240px]">Description</th>
                      {roles.map(r => (
                        <th key={r.key} className="text-center p-3 min-w-[90px]" title={r.name}>
                          <span className="truncate block max-w-[100px]">{r.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {perms.map(p => (
                      <tr key={p.key} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-3 font-medium text-neutral-900">
                          <div>{p.label}</div>
                          <div className="font-mono text-[10px] text-neutral-400">{p.key}</div>
                        </td>
                        <td className="p-3 text-neutral-600">
                          {p.description}
                        </td>
                        {roles.map(r => {
                          const hasWildcard = r.permissions?.includes('*');
                          const hasDirect = r.permissions?.includes(p.key);
                          const isAllowed = hasWildcard || hasDirect;

                          return (
                            <td key={r.key} className="p-3 text-center">
                              {isAllowed ? (
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                                  hasWildcard ? 'bg-[#D4AF37]/20 text-[#9C6B30]' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  <Check size={12} />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-neutral-300">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
