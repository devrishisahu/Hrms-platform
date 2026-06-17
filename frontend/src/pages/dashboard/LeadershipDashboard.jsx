import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Activity, Clock, Calendar, TrendingUp, CheckCircle, 
  AlertCircle, ArrowUpRight, BarChart3, PieChart, Info, RefreshCw, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as ReChartsPieChart, Pie
} from 'recharts';
import { Link } from 'react-router-dom';
import * as ep from '../../api/endpoints';
import { errMsg } from '../../api/client';

export default function LeadershipDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dbData, setDbData] = useState(null);
  const [headcountData, setHeadcountData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [lopData, setLopData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Generate the last 6 months for the selector dropdown
  const monthOptions = (() => {
    const options = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      options.push(`${yr}-${mo}`);
      d.setMonth(d.getMonth() - 1);
    }
    return options;
  })();

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [resDash, resHeadcount, resAttendance, resLop] = await Promise.all([
        ep.getDashboard(),
        ep.reportHeadcount(),
        ep.reportAttendance(selectedMonth),
        ep.reportLOP(selectedMonth)
      ]);

      setDbData(resDash.data.data);
      setHeadcountData(resHeadcount.data.data);
      setAttendanceData(resAttendance.data.data);
      setLopData(resLop.data.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 w-64 bg-white/5 rounded-xl" />
          <div className="h-10 w-40 bg-white/5 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-white/5 border border-white/5 rounded-2xl" />
          <div className="h-[400px] bg-white/5 border border-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Summary Metrics
  const headcount = dbData?.org?.headcount || headcountData?.total || 0;
  const presentToday = dbData?.org?.presentToday || 0;
  const onLeaveToday = dbData?.org?.onLeaveToday || 0;
  const absentToday = Math.max(0, headcount - presentToday - onLeaveToday);
  const presenceRateToday = headcount > 0 ? Math.round((presentToday / headcount) * 100) : 0;
  const onboardingCount = dbData?.org?.onboarding || 0;
  const pendingLeaves = dbData?.org?.pendingLeaves || 0;

  // Monthly aggregates calculations
  let monthlyPresenceRate = 0;
  let monthlyOvertimeHours = 0;
  if (attendanceData?.rows && attendanceData.rows.length > 0) {
    let totalPresent = 0;
    let totalExpected = 0;
    let totalOTMinutes = 0;

    attendanceData.rows.forEach((r) => {
      totalPresent += (r.present || 0) + (r.halfDay || 0) * 0.5;
      totalExpected += (r.present || 0) + (r.late || 0) + (r.halfDay || 0) + (r.absent || 0) + (r.onLeave || 0);
      totalOTMinutes += (r.overtimeMinutes || 0);
    });

    monthlyPresenceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
    monthlyOvertimeHours = Math.round(totalOTMinutes / 60);
  }

  const totalLopDays = lopData?.rows?.reduce((sum, r) => sum + (r.lopDays || r.days || 0), 0) || 0;

  // Recharts Department Distribution Data
  const deptChartData = headcountData?.byDepartment?.map((d) => ({
    name: d.department,
    count: d.count
  })) || [];

  // Recharts Status Distribution Data
  const statusColors = {
    active: '#10B981',      // Emerald
    onboarding: '#3B82F6',  // Blue
    suspended: '#EF4444',   // Red
    exited: '#6B7280'       // Gray
  };
  const statusChartData = headcountData?.byStatus?.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    color: statusColors[s.status] || '#EC4899'
  })) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="p-8 pb-20 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Executive Summary
            {refreshing && <RefreshCw className="w-5 h-5 animate-spin text-crimson-400" />}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time organizational health and monthly operational stats.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData(true)}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="flex items-center bg-noir-900 border border-white/10 rounded-xl px-3 py-1.5 gap-2">
            <Calendar className="w-4 h-4 text-crimson-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm text-slate-200 font-semibold focus:outline-none cursor-pointer pr-2"
            >
              {monthOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-noir-950 text-white">
                  {new Date(opt + '-02').toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-crimson-500/10 border border-crimson-500/30 rounded-2xl text-crimson-400 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        
        {/* Workforce Overview */}
        <motion.div variants={itemVariants} className="glass-card p-6 bg-gradient-to-br from-crimson-950/10 to-noir-900 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-crimson-500/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workforce</p>
              <h3 className="text-4xl font-extrabold text-white mt-2">{headcount}</h3>
            </div>
            <div className="p-3 bg-crimson-500/10 text-crimson-400 rounded-xl border border-crimson-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-blue-400">{onboardingCount}</span> in onboarding status
          </div>
        </motion.div>

        {/* Presence Ring */}
        <motion.div variants={itemVariants} className="glass-card p-6 bg-gradient-to-br from-crimson-950/10 to-noir-900 border-white/5">
          <div className="flex justify-between items-center gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Presence</p>
              <h3 className="text-4xl font-extrabold text-white mt-1">{presenceRateToday}%</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-emerald-400 font-semibold">{presentToday}</span> present today
              </p>
            </div>
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="5" fill="transparent" />
                <circle cx="32" cy="32" r="28" stroke="#C50337" strokeWidth="5" fill="transparent"
                  strokeDasharray={175} strokeDashoffset={175 - (175 * presenceRateToday) / 100} 
                  strokeLinecap="round" className="transition-all duration-500" />
              </svg>
              <span className="absolute text-[10px] font-bold text-slate-300">{presentToday}/{headcount}</span>
            </div>
          </div>
        </motion.div>

        {/* Today's Absences & Leaves */}
        <motion.div variants={itemVariants} className="glass-card p-6 bg-gradient-to-br from-crimson-950/10 to-noir-900 border-white/5">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Out of Office</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-extrabold text-yellow-500">{onLeaveToday}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">On Leave</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-crimson-400">{absentToday}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Absent</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Pending Approvals */}
        <motion.div variants={itemVariants} className="glass-card p-6 bg-gradient-to-br from-crimson-950/10 to-noir-900 border-white/5 relative group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Decisions</p>
              <h3 className={`text-4xl font-extrabold mt-2 ${pendingLeaves > 0 ? 'text-amber-400' : 'text-white'}`}>
                {pendingLeaves}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link to="/dashboard/approvals" className="text-xs text-crimson-400 hover:text-crimson-300 font-bold flex items-center gap-1 transition-colors">
              Go to Approvals <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>

      </motion.div>

      {/* OPERATIONS & MONTHLY PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Operations */}
        <div className="glass-card p-6 bg-noir-900/40 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-crimson-400" /> Operational Stats
              </h3>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-md text-slate-400 font-bold uppercase tracking-wider">
                Monthly
              </span>
            </div>
            
            <div className="divide-y divide-white/5 mt-4">
              <div className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Avg Presence Rate</p>
                  <p className="text-[10px] text-slate-500">Cumulative expected workdays</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{monthlyPresenceRate}%</p>
                  <p className="text-[10px] text-slate-400">Target: 95%</p>
                </div>
              </div>

              <div className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Total Worked Overtime</p>
                  <p className="text-[10px] text-slate-500">Accumulated workforce hours</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{monthlyOvertimeHours} hrs</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">Extra Productivity</p>
                </div>
              </div>

              <div className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Unpaid Leave Days (LOP)</p>
                  <p className="text-[10px] text-slate-500">Loss of Pay deductions</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-yellow-500">{totalLopDays} days</p>
                  <p className="text-[10px] text-slate-400">Deductions pending</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-500 flex gap-2 items-start mt-4">
            <Info className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Operational stats are aggregated monthly. Set a different month in the header to view historical trends.</span>
          </div>
        </div>

        {/* Recharts Department Breakdown */}
        <div className="glass-card p-6 bg-noir-900/40 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-crimson-400" /> Departmental Distribution
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Real-time headcount
            </span>
          </div>

          {deptChartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500 text-sm">
              No department data available. Ensure departments are allocated to employees.
            </div>
          ) : (
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#C50337" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#ffffff30" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#02060E', borderColor: '#ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="url(#colorBar)" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM SECTION: STATUS BREAKDOWN & DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Distribution (Pie / List) */}
        <div className="glass-card p-6 bg-noir-900/40 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-crimson-400" /> Workforce Status
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Employment state
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2 justify-center lg:justify-between">
            {statusChartData.length === 0 ? (
              <div className="text-slate-500 text-sm py-8 text-center w-full">No status metrics found.</div>
            ) : (
              <>
                {/* Pie Chart Representation */}
                <div className="w-32 h-32 shrink-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReChartsPieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={48}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </ReChartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xs text-slate-400 uppercase tracking-widest text-[8px]">Active</span>
                    <span className="text-lg font-black text-white">{dbData?.org?.headcount || 0}</span>
                  </div>
                </div>

                {/* Status Legend List */}
                <div className="space-y-2.5 flex-1 w-full">
                  {statusChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-semibold text-slate-300">{item.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detailed Department Breakdown Table */}
        <div className="glass-card p-6 bg-noir-900/40 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-crimson-400" /> Department Representation
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Full organization distribution
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-noir-900/30 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4 text-center">Staff Count</th>
                  <th className="py-2.5 px-4 text-right">Representation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {headcountData?.byDepartment?.map((dept, index) => {
                  const share = headcount > 0 ? Math.round((dept.count / headcount) * 100) : 0;
                  return (
                    <tr key={index} className="hover:bg-white/5 transition-colors text-sm">
                      <td className="py-3 px-4 font-bold text-white">{dept.department}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">{dept.count}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-xs font-bold text-slate-400">{share}%</span>
                          <div className="w-16 h-1.5 bg-noir-900 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-crimson-600 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!headcountData?.byDepartment || headcountData.byDepartment.length === 0) && (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-slate-500 text-xs">No records found.</td>
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
