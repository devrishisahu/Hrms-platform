import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ShieldAlert, CheckCircle2, Trash2, Plus, Info } from 'lucide-react';
import * as ep from '../api/endpoints';
import { errMsg } from '../api/client';

const TABS = {
  departments: {
    label: 'Departments',
    fields: [{ k: 'name', label: 'Name', required: true }, { k: 'code', label: 'Code' }],
  },
  designations: {
    label: 'Designations',
    fields: [{ k: 'title', label: 'Title', required: true }, { k: 'grade', label: 'Grade' }, { k: 'level', label: 'Level', type: 'number' }],
  },
  shifts: {
    label: 'Shifts',
    fields: [
      { k: 'name', label: 'Name', required: true },
      { k: 'startTime', label: 'Start (HH:mm)', required: true, placeholder: '09:30' },
      { k: 'endTime', label: 'End (HH:mm)', required: true, placeholder: '18:30' },
      { k: 'graceMinutes', label: 'Grace (min)', type: 'number', placeholder: '15' },
      { k: 'halfDayAfterMinutes', label: 'Half-day after (min)', type: 'number', placeholder: '120' },
    ],
  },
  holidays: {
    label: 'Holidays',
    fields: [{ k: 'name', label: 'Name', required: true }, { k: 'date', label: 'Date', type: 'date', required: true }, { k: 'location', label: 'Location', placeholder: 'all' }],
  },
};

const LEAVE_FIELDS = [
  { k: 'name', label: 'Name', required: true },
  { k: 'code', label: 'Code', required: true, placeholder: 'CL' },
  { k: 'annualQuota', label: 'Annual quota', type: 'number', required: true },
  { k: 'maxConsecutiveDays', label: 'Max consecutive (0 = none)', type: 'number' },
  { k: 'carryForwardLimit', label: 'Carry-forward limit', type: 'number' },
];

function Crud({ entity, def, isLeave }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = async () => {
    try {
      const { data } = isLeave ? await ep.leaveTypes() : await ep.orgList(entity);
      setItems(data.data || []);
    } catch (err) {
      console.error(`Failed to load ${entity}:`, err);
    }
  };

  useEffect(() => {
    load();
  }, [entity]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    try {
      if (isLeave) await ep.createLeaveType(form);
      else await ep.orgCreate(entity, form);
      setOk(`Added ${def.label.toLowerCase().replace(/s$/, '')} successfully.`);
      setForm({});
      await load();
    } catch (err) { setError(errMsg(err)); }
  };

  const remove = async (id) => {
    if (isLeave) return;
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await ep.orgDelete(entity, id);
      setOk('Deleted entry successfully.');
      await load();
    } catch (e) { setError(errMsg(e)); }
  };

  const cols = def.fields.map((f) => f.k);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 bg-crimson-500/10 border border-crimson-500/30 rounded-xl text-crimson-400 text-xs flex gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {ok && (
        <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs flex gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{ok}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="glass-card p-5 bg-noir-900/40">
        <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
          Add New {def.label.replace(/s$/, '')}
        </h4>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {def.fields.map((f) => (
              <div key={f.k} className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{f.label}{f.required && ' *'}</label>
                <input 
                  type={f.type || 'text'} 
                  required={f.required} 
                  placeholder={f.placeholder || ''}
                  value={form[f.k] ?? ''} 
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} 
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>
            ))}
          </div>
          <button className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg hover:shadow-crimson-500/20 flex items-center gap-1.5 self-start">
            <Plus className="w-4 h-4" /> Add {def.label.toLowerCase().replace(/s$/, '')}
          </button>
        </form>
      </div>

      {/* Table Card */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                {def.fields.map((f) => (
                  <th key={f.k} className="py-4 px-6">{f.label}</th>
                ))}
                {!isLeave && <th className="py-4 px-6"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((it) => (
                <tr key={it._id} className="hover:bg-white/5 transition-colors">
                  {cols.map((c) => {
                    const isCode = ['code', 'startTime', 'endTime', 'date'].includes(c);
                    return (
                      <td key={c} className={`py-4 px-6 text-sm ${isCode ? 'font-mono text-slate-300' : 'text-slate-200'}`}>
                        {c === 'date' && it[c] 
                          ? new Date(it[c]).toLocaleDateString() 
                          : String(it[c] ?? '—')}
                      </td>
                    );
                  })}
                  {!isLeave && (
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => remove(it._id)}
                        className="p-1.5 hover:bg-crimson-500/10 text-slate-500 hover:text-crimson-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 1} className="py-10 px-6 text-center text-slate-500 text-sm">
                    No records found. Add the first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OrgSettings() {
  const [tab, setTab] = useState('departments');

  return (
    <div className="p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-crimson-500" /> Organization Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage departments, designations, work shifts, holidays, and leave types</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5 pb-px gap-2 overflow-x-auto hide-scrollbar">
          {Object.entries(TABS).map(([k, v]) => (
            <button 
              key={k} 
              onClick={() => setTab(k)}
              className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === k ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
            >
              {v.label}
            </button>
          ))}
          <button 
            onClick={() => setTab('leave-types')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === 'leave-types' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
          >
            Leave Types
          </button>
        </div>

        {/* Main Content Pane */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={tab}
          className="space-y-6"
        >
          {tab !== 'leave-types' ? (
            <Crud key={tab} entity={tab} def={TABS[tab]} />
          ) : (
            <Crud key="lt" entity="leave-types" def={{ label: 'Leave Types', fields: LEAVE_FIELDS }} isLeave />
          )}
        </motion.div>

      </div>
    </div>
  );
}
