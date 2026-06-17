import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ShieldAlert, CheckSquare, Calendar, Clock, FileText, User } from 'lucide-react';
import * as ep from '../api/endpoints';
import { errMsg } from '../api/client';

export default function Approvals() {
  const [data, setData] = useState({ leaves: [], regularizations: [], total: 0 });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const { data: res } = await ep.pendingApprovals();
      setData(res.data || { leaves: [], regularizations: [], total: 0 });
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (kind, id, action) => {
    const comment = window.prompt(`${action === 'approve' ? 'Approve' : 'Reject'} — add a comment (optional):`) ?? '';
    try {
      if (kind === 'leave') await ep.actLeave(id, { action, comment });
      else await ep.actRegularization(id, { action, comment });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-crimson-500" /> Pending Approvals
            </h1>
            <p className="text-slate-400 mt-2">Approve or reject leave requests and attendance corrections</p>
          </div>
          
          <span className="px-4 py-2 bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 font-bold rounded-full text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto">
            <span className="w-2.5 h-2.5 bg-crimson-500 rounded-full animate-pulse" />
            {data.total} Actions Required
          </span>
        </div>

        {error && (
          <div className="p-4 bg-crimson-500/10 border border-crimson-500/30 rounded-2xl text-crimson-400 text-sm flex gap-3 items-center">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Leaves approvals section */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 bg-white/20-[0.02]">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-crimson-400" /> Leave Requests
            </h3>
          </div>
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Leave Type</th>
                  <th className="py-4 px-6 font-mono text-[11px]">Duration</th>
                  <th className="py-4 px-6 text-center">Days</th>
                  <th className="py-4 px-6">Reason</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.leaves.map((r) => (
                  <tr key={r._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                          {r.employee?.firstName?.[0]}{r.employee?.lastName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300">{r.leaveType?.name || '—'}</td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      <div>{r.from}</div>
                      <div className="text-[10px] text-slate-500">to {r.to}</div>
                    </td>
                    <td className="py-4 px-6 text-center text-white font-semibold font-mono">{r.days}</td>
                    <td className="py-4 px-6 text-slate-400 text-sm max-w-[200px] truncate" title={r.reason}>
                      {r.reason || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => act('leave', r._id, 'approve')}
                          className="px-3.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button 
                          onClick={() => act('leave', r._id, 'reject')}
                          className="px-3.5 py-1.5 bg-crimson-500/10 hover:bg-crimson-500/20 text-crimson-400 border border-crimson-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.leaves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-slate-500">
                      No leave requests pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regularizations section */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 bg-white/20-[0.02]">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-crimson-400" /> Attendance Regularizations
            </h3>
          </div>
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6 font-mono text-[11px]">Date</th>
                  <th className="py-4 px-6 font-mono text-[11px]">Requested Punch</th>
                  <th className="py-4 px-6">Reason</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.regularizations.map((r) => (
                  <tr key={r._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                          {r.employee?.firstName?.[0]}{r.employee?.lastName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300 font-mono">{r.date}</td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {new Date(r.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-2 text-slate-600">→</span>
                      {new Date(r.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-sm max-w-[200px] truncate" title={r.reason}>
                      {r.reason || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => act('reg', r._id, 'approve')}
                          className="px-3.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button 
                          onClick={() => act('reg', r._id, 'reject')}
                          className="px-3.5 py-1.5 bg-crimson-500/10 hover:bg-crimson-500/20 text-crimson-400 border border-crimson-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.regularizations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 px-6 text-center text-slate-500">
                      No regularizations pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
