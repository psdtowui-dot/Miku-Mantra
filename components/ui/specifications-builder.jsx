'use client';
import { Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function SpecificationsBuilder({ specifications = [], onChange }) {
  const handleAdd = () => {
    const newSpec = {
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      label: '',
      value: '',
      enabled: true,
      order: specifications.length
    };
    onChange([...specifications, newSpec]);
  };

  const handleUpdate = (id, field, val) => {
    onChange(specifications.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleDelete = (id) => {
    onChange(specifications.filter(s => s.id !== id));
  };

  const handleReorder = (newOrder) => {
    const updated = newOrder.map((s, idx) => ({ ...s, order: idx }));
    onChange(updated);
  };

  const sortedSpecs = [...specifications].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
          Product Specifications
        </h4>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 bg-neutral-900 text-white px-4 py-2 text-[10px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] transition-colors font-medium shadow-xs"
        >
          <Plus size={12} /> Add Specification
        </button>
      </div>

      {sortedSpecs.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/30">
          <p className="text-xs text-neutral-400">No specifications added yet.</p>
          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 inline-flex items-center gap-1.5 border border-neutral-200 text-neutral-600 hover:text-[#9C6B30] hover:border-[#9C6B30] px-4 py-2 text-[10px] tracking-widest uppercase rounded-md transition-colors bg-white font-medium"
          >
            <Plus size={12} /> Add First Specification
          </button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={sortedSpecs}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {sortedSpecs.map((spec) => (
            <Reorder.Item
              key={spec.id}
              value={spec}
              className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-200 shadow-2xs hover:shadow-xs transition-shadow duration-200 select-none"
            >
              {/* Drag handle */}
              <div className="cursor-grab text-neutral-400 hover:text-neutral-600 transition-colors p-1" title="Drag to reorder">
                <GripVertical size={14} />
              </div>

              {/* Checkbox enabled/disabled */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={spec.enabled !== false}
                  onChange={(e) => handleUpdate(spec.id, 'enabled', e.target.checked)}
                  className="accent-[#9C6B30] h-4 w-4 rounded-md cursor-pointer border-neutral-300"
                  title={spec.enabled !== false ? 'Enabled (visible on frontend)' : 'Disabled (hidden on frontend)'}
                />
              </div>

              {/* Specification Name / Label */}
              <div className="flex-1">
                <input
                  type="text"
                  value={spec.label}
                  onChange={(e) => handleUpdate(spec.id, 'label', e.target.value)}
                  placeholder="Specification Name (e.g., Material)"
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                />
              </div>

              {/* Specification Value */}
              <div className="flex-1">
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => handleUpdate(spec.id, 'value', e.target.value)}
                  placeholder="Specification Value (e.g., 22K Yellow Gold)"
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                />
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(spec.id)}
                className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-lg hover:bg-neutral-50 cursor-pointer"
                title="Remove Specification"
              >
                <Trash2 size={14} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}
