import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, CheckCircle2, ShieldAlert, Users, Award, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import * as ep from '../api/endpoints';
import { errMsg } from '../api/client';
import Badge from '../components/Badge.jsx';

const fmtT = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtMins = (m) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '—');

function RegularizeForm({ onDone }) {
  const [form, setForm] = useState({ date: '', inTime: '09:30', outTime: '18:30', reason: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    try {
      await ep.requestRegularization({
        date: form.date,
        requestedPunchIn: `${form.date}T${form.inTime}:00.000Z`,
        requestedPunchOut: `${form.date}T${form.outTime}:00.000Z`,
        reason: form.reason,
      });
      setOk('Regularization request sent to your manager.');
      setForm({ date: '', inTime: '09:30', outTime: '18:30', reason: '' });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  };

  return (
    <div className="glass-card p-6 bg-noir-900/40">
      <h3 className="text-lg font-bold text-white mb-2">Request Regularization</h3>
      <p className="text-xs text-slate-400 mb-6">Missed a punch or forgot to clock out? Request a correction for approval.</p>
      
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="p-3 bg-crimson-500/10 border border-crimson-500/30 rounded-xl text-crimson-400 text-xs flex gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {ok && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs flex gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{ok}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Punch In</label>
            <input type="time" required value={form.inTime} onChange={(e) => setForm({ ...form, inTime: e.target.value })}
              className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Punch Out</label>
            <input type="time" required value={form.outTime} onChange={(e) => setForm({ ...form, outTime: e.target.value })}
              className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason</label>
          <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Client site visit, device issues"
            className="w-full bg-noir-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
        </div>

        <button className="w-full py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20">
          Submit Regularization
        </button>
      </form>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('my');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [my, setMy] = useState({ records: [], summary: {} });
  const [team, setTeam] = useState([]);
  const [regs, setRegs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMy = async () => {
    setIsLoading(true);
    try {
      const [{ data: a }, { data: r }] = await Promise.all([
        ep.myAttendance(month),
        ep.listRegularizations('pending')
      ]);
      setMy(a.data);
      setRegs(r.data.requests || []);
    } catch (err) {
      console.error('Failed to load my attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const fn = tab === 'all' ? ep.allAttendance : ep.teamAttendance;
      const { data } = await fn(date);
      setTeam(data.data.records || []);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'my') loadMy();
    else loadTeam();
  }, [tab, month, date]);

  const canTeam = ['manager', 'hr', 'leadership'].includes(user?.role);
  const canAll = ['hr', 'leadership'].includes(user?.role);

  return (
    <div className="p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-crimson-500" /> Attendance logs
          </h1>
          <p className="text-slate-400 mt-2">Manage daily clock-ins, regularization and team records</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5 pb-px gap-2">
          <button 
            onClick={() => setTab('my')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative ${tab === 'my' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
          >
            My Muster
          </button>
          {canTeam && (
            <button 
              onClick={() => setTab('team')}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${tab === 'team' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
            >
              Team Attendance
            </button>
          )}
          {canAll && (
            <button 
              onClick={() => setTab('all')}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${tab === 'all' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
            >
              All Records
            </button>
          )}
        </div>

        {tab === 'my' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Table Logs */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <input 
                  type="month" 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-noir-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-crimson-500 w-full sm:w-48 cursor-pointer"
                />

                <div className="flex flex-wrap gap-2">
                  {Object.entries(my.summary).map(([k, v]) => (
                    <span key={k} className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/5 border border-white/5 text-slate-300">
                      {k}: <b className="text-white font-mono">{v}</b>
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6 font-mono text-[11px]">Clock In</th>
                        <th className="py-4 px-6 font-mono text-[11px]">Clock Out</th>
                        <th className="py-4 px-6">Worked</th>
                        <th className="py-4 px-6">OT</th>
                        <th className="py-4 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {my.records.map((r) => (
                        <tr key={r._id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 text-sm font-semibold text-white font-mono">
                            {r.date}
                            {r.isRegularized && <span className="text-crimson-400 text-xs ml-1" title="Regularized">✱</span>}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">{fmtT(r.punchIn)}</td>
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">{fmtT(r.punchOut)}</td>
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">{fmtMins(r.workedMinutes)}</td>
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">{fmtMins(r.overtimeMinutes)}</td>
                          <td className="py-4 px-6">
                            <Badge value={r.status} />
                          </td>
                        </tr>
                      ))}
                      {my.records.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 px-6 text-center text-slate-500">
                            No attendance recorded for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Regularization Form */}
            <div className="lg:col-span-4 space-y-6">
              <RegularizeForm onDone={loadMy} />

              {regs.length > 0 && (
                <div className="glass-card p-5 bg-noir-900/40">
                  <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-crimson-400" /> Pending Regularizations
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/5 font-bold uppercase tracking-wider pb-2">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Reason</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {regs.map((r) => (
                          <tr key={r._id} className="text-slate-300">
                            <td className="py-2.5 font-mono">{r.date}</td>
                            <td className="py-2.5 max-w-[120px] truncate" title={r.reason}>{r.reason}</td>
                            <td className="py-2.5 text-right"><Badge value={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {(tab === 'team' || tab === 'all') && (
          <div className="space-y-6">
            <div>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-crimson-500 w-full sm:w-48 cursor-pointer"
              />
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Employee</th>
                      <th className="py-4 px-6">Employee ID</th>
                      <th className="py-4 px-6 font-mono text-[11px]">Clock In</th>
                      <th className="py-4 px-6 font-mono text-[11px]">Clock Out</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {team.map((r) => (
                      <tr key={r._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-white flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-crimson-500/10 border border-crimson-500/30 text-crimson-400 text-xs flex items-center justify-center font-bold">
                            {r.employee?.firstName?.[0]}{r.employee?.lastName?.[0]}
                          </span>
                          <span>{r.employee?.firstName} {r.employee?.lastName}</span>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-300 font-mono">{r.employee?.employeeId || '—'}</td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono">{fmtT(r.punchIn)}</td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono">{fmtT(r.punchOut)}</td>
                        <td className="py-4 px-6">
                          <Badge value={r.status} />
                        </td>
                      </tr>
                    ))}
                    {team.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 px-6 text-center text-slate-500">
                          No punch logs found for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
