import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle, CheckCircle2, ShieldAlert, Clock, X, ChevronRight, FileText } from 'lucide-react';
import * as ep from '../api/endpoints';
import { errMsg } from '../api/client';
import Badge from '../components/Badge.jsx';

export default function Leave() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ leaveType: '', from: '', to: '', isHalfDay: false, reason: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const [{ data: b }, { data: r }, { data: t }] = await Promise.all([
        ep.myBalances(),
        ep.myLeaves(),
        ep.leaveTypes()
      ]);
      setBalances(b.data.balances || []);
      setRequests(r.data.requests || []);
      setTypes(t.data || []);
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await ep.applyLeave(form);
      setOk('Leave request submitted successfully for approval.');
      setForm({ leaveType: '', from: '', to: '', isHalfDay: false, reason: '' });
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this leave? An approved leave will restore your balance.')) return;
    try {
      await ep.cancelLeave(id);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-crimson-500" /> Leave Management
          </h1>
          <p className="text-slate-400 mt-2">Apply for leaves and track your balances</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {balances.map((b) => {
            const available = b.allocated + b.carriedForward - b.used;
            return (
              <div key={b._id} className="glass-card p-5 relative overflow-hidden bg-gradient-to-br from-crimson-900/10 to-noir-900 border-white/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-crimson-500/5 rounded-full blur-2xl" />
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  {b.leaveType.name} <span className="text-[10px] text-crimson-400 font-bold px-1.5 py-0.5 rounded bg-crimson-500/10 border border-crimson-500/20">{b.leaveType.code}</span>
                </h3>
                <div className="text-4xl font-extrabold text-white mb-2">
                  {b.leaveType.isLOP ? '∞' : available}
                </div>
                <div className="text-xs text-slate-500">
                  {b.leaveType.isLOP ? 'Unpaid Leave Type' : `Allocated: ${b.allocated + b.carriedForward} · Used: ${b.used}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form and History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Apply Form */}
          <div className="lg:col-span-5 glass-card p-6 bg-noir-900/40">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              Apply for Leave
            </h3>

            <form onSubmit={submit} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-crimson-500/10 border border-crimson-500/30 rounded-xl text-crimson-400 text-sm flex gap-2 items-start">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {ok && (
                <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex gap-2 items-start">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{ok}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Type</label>
                <select 
                  required 
                  value={form.leaveType} 
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-noir">Choose type...</option>
                  {types.map((t) => (
                    <option key={t._id} value={t._id} className="bg-noir">
                      {t.name}{t.isLOP ? ' (unpaid)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">From</label>
                  <input 
                    type="date" 
                    required 
                    value={form.from} 
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">To</label>
                  <input 
                    type="date" 
                    required 
                    value={form.to} 
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason</label>
                <input 
                  type="text" 
                  required 
                  value={form.reason} 
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Family emergency, dental checkup"
                  className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-crimson-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-3 cursor-pointer group text-sm text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={form.isHalfDay} 
                    onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-noir text-crimson-600 focus:ring-crimson-500"
                  />
                  <span className="group-hover:text-white transition-colors">Half Day Request</span>
                </label>
                
                <button className="px-6 py-3 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20">
                  Apply Leave
                </button>
              </div>
            </form>
          </div>

          {/* History */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 bg-white/20-[0.02] flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-crimson-400" /> Leave Request History
                </h3>
              </div>
              
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Leave Type</th>
                      <th className="py-4 px-6 font-mono text-[11px]">Duration</th>
                      <th className="py-4 px-6 text-center">Days</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Approver Note</th>
                      <th className="py-4 px-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {requests.map((r) => (
                      <tr key={r._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-white">{r.leaveType?.name || '—'}</td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                          <div>{r.from}</div>
                          <div className="text-[10px] text-slate-500">to {r.to}</div>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-300 font-semibold font-mono">{r.days}</td>
                        <td className="py-4 px-6">
                          <Badge value={r.status} />
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs italic max-w-[180px] truncate" title={r.approverComment}>
                          {r.approverComment || '—'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {['pending', 'approved'].includes(r.status) && (
                            <button 
                              onClick={() => cancel(r._id)}
                              className="px-3 py-1 bg-white/5 hover:bg-crimson-500/20 hover:text-crimson-400 border border-white/10 hover:border-crimson-500/30 rounded-lg text-xs font-semibold text-slate-300 transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center">
                          <div className="text-slate-500 flex flex-col items-center justify-center gap-2">
                            <Clock className="w-8 h-8 text-slate-600" />
                            <span>No leave requests found</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
