import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, Calendar, Shield, Clock, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import * as ep from '../api/endpoints';

const Table = ({ rows }) => {
  if (!rows?.length) return <div className="text-slate-500 py-10 text-center text-sm">No data available for this selection.</div>;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto min-w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-noir-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
            {headers.map((h) => (
              <th key={h} className="py-3 px-5 font-semibold">
                {h.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              {headers.map((h) => {
                const isNumeric = typeof r[h] === 'number';
                const isCode = /id|date|from|to|code|status/i.test(h);
                return (
                  <td key={h} className={`py-3 px-5 text-sm ${isNumeric || isCode ? 'font-mono text-slate-300' : 'text-slate-200'}`}>
                    {String(r[h] ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function Reports() {
  const { user } = useAuth();
  const [tab, setTab] = useState('headcount');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setData(null);
    try {
      if (tab === 'headcount') { const { data: d } = await ep.reportHeadcount(); setData(d.data); }
      if (tab === 'attendance') { const { data: d } = await ep.reportAttendance(month); setData(d.data); }
      if (tab === 'leave') { const { data: d } = await ep.reportLeaveUsage(); setData(d.data); }
      if (tab === 'lop') { const { data: d } = await ep.reportLOP(month); setData(d.data); }
      if (tab === 'audit') { const { data: d } = await ep.auditLogs(1); setData(d.data); }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, month]);

  const csv = () => {
    const map = {
      headcount: ['/reports/headcount', {}, 'headcount.csv'],
      attendance: ['/reports/attendance-summary', { month }, `attendance-${month}.csv`],
      leave: ['/reports/leave-usage', {}, 'leave-usage.csv'],
      lop: ['/reports/lop', { month }, `lop-${month}.csv`],
    };
    if (map[tab]) ep.downloadCSV(...map[tab]);
  };

  return (
    <div className="p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-crimson-500" /> Operational Reports
            </h1>
            <p className="text-slate-400 mt-2">Generate, view, and export HR intelligence reports</p>
          </div>
          
          {tab !== 'audit' && (
            <button 
              onClick={csv}
              className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 flex items-center gap-2 self-start sm:self-auto"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5 pb-px gap-2 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setTab('headcount')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === 'headcount' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
          >
            Headcount
          </button>
          <button 
            onClick={() => setTab('attendance')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === 'attendance' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
          >
            Attendance Summary
          </button>
          <button 
            onClick={() => setTab('leave')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === 'leave' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
          >
            Leave Usage
          </button>
          <button 
            onClick={() => setTab('lop')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === 'lop' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
          >
            LOP (Payroll)
          </button>
          {user?.role === 'hr' && (
            <button 
              onClick={() => setTab('audit')}
              className={`px-6 py-3 text-sm font-semibold transition-all relative shrink-0 ${tab === 'audit' ? 'text-white border-b-2 border-crimson-500' : 'text-slate-400 hover:text-white'}`}
            >
              Audit Trail
            </button>
          )}
        </div>

        {/* Sub-filters (if applicable) */}
        {(tab === 'attendance' || tab === 'lop') && (
          <div>
            <input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              className="bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-crimson-500 w-full sm:w-48 cursor-pointer"
            />
          </div>
        )}

        {/* Report Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-3 border-crimson-500/30 border-top-color-[#C50337] rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {tab === 'headcount' && data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-6 bg-noir-900/40 space-y-4">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-crimson-400" /> By Department
                  </h3>
                  <Table rows={data.byDepartment} />
                </div>
                
                <div className="glass-card p-6 bg-noir-900/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-crimson-400" /> By Status
                    </h3>
                    <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs font-semibold font-mono text-slate-300">
                      Total: {data.total}
                    </span>
                  </div>
                  <Table rows={data.byStatus} />
                </div>
              </div>
            )}

            {tab !== 'headcount' && tab !== 'audit' && data && (
              <div className="glass-card overflow-hidden">
                <Table rows={data.rows} />
              </div>
            )}

            {tab === 'audit' && data && (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">User</th>
                        <th className="py-4 px-6">Action</th>
                        <th className="py-4 px-6">Entity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.items.map((l) => (
                        <tr key={l._id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                            {new Date(l.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                            {l.user?.email || '—'}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 text-xs font-mono font-bold uppercase tracking-wider">
                              {l.action}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-200 font-medium">
                            {l.entity || '—'}
                          </td>
                        </tr>
                      ))}
                      {data.items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 px-6 text-center text-slate-500">
                            No logs recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
