import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, FileText, CheckSquare, Activity, Calendar, 
  Settings, UserCheck, Shield, Award, RefreshCw, Check, X, AlertCircle,
  Clock, ArrowRight, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as ep from '../../api/endpoints';

export default function HrDashboard() {
  const user = useSelector((state) => state.auth?.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    headcount: 0,
    presentToday: 0,
    onLeaveToday: 0,
    pendingLeaves: 0,
    onboarding: 0
  });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [auditFeed, setAuditFeed] = useState([]);
  const [actionPending, setActionPending] = useState({});
  const [error, setError] = useState('');

  // Punch states
  const [records, setRecords] = useState([]);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const [dashRes, empRes, deptRes, leaveRes, auditRes, attRes] = await Promise.all([
        ep.getDashboard(),
        ep.listEmployees({ limit: 200 }),
        ep.orgList('departments'),
        ep.leaveRequests('pending'),
        ep.auditLogs(1),
        ep.myAttendance(currentMonth)
      ]);

      if (dashRes.data?.data?.org) {
        setStats(dashRes.data.data.org);
      }
      setEmployees(empRes.data?.data?.employees || []);
      setDepartments(deptRes.data?.data || []);
      setPendingRequests(leaveRes.data?.data?.requests || []);
      setAuditFeed(auditRes.data?.data?.items || []);
      setRecords(attRes.data?.data?.records || []);
    } catch (err) {
      console.error('Failed to load HR Dashboard data:', err);
      setError('Error syncing live operations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Punch logic helpers
  const timezone = user?.tenant?.settings?.timezone || 'Asia/Kolkata';

  const getTodayStr = () => {
    const localDateStr = new Date().toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const [m, d, y] = localDateStr.split('/');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();
  const todayRecord = records.find(r => r.date === todayStr);

  const getPunchState = () => {
    if (!todayRecord || !todayRecord.punchIn) return 'out'; // not clocked in
    if (todayRecord.punchIn && !todayRecord.punchOut) return 'in'; // clocked in, not out
    return 'completed'; // clocked out (shift complete)
  };
  const punchState = getPunchState();

  const handlePunch = async () => {
    if (punching || punchState === 'completed') return;
    const type = punchState === 'out' ? 'in' : 'out';
    setPunching(true);
    try {
      await ep.punch({ type, mode: 'web' });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to punch ${type}`);
    } finally {
      setPunching(false);
    }
  };

  const getPunchStatusDetails = () => {
    const fmt = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone });
    if (punchState === 'out') return 'Not clocked in yet today.';
    if (punchState === 'in') return `Clocked in at ${fmt(todayRecord.punchIn)}. Active shift running.`;
    return `Completed shift today. In: ${fmt(todayRecord.punchIn)} | Out: ${fmt(todayRecord.punchOut)}.`;
  };

  const [activeRequest, setActiveRequest] = useState(null);
  const [modalComment, setModalComment] = useState('');
  const [modalAction, setModalAction] = useState('');

  // Handle Approve/Reject leaves from custom modal
  const submitLeaveAction = async () => {
    if (!activeRequest) return;
    const { _id } = activeRequest;
    setActionPending(prev => ({ ...prev, [_id]: true }));
    try {
      await ep.actLeave(_id, { action: modalAction, comment: modalComment });
      await loadData();
      setActiveRequest(null);
      setModalComment('');
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${modalAction} leave request.`);
    } finally {
      setActionPending(prev => ({ ...prev, [_id]: false }));
    }
  };

  // Calculations for analytics
  const deptMap = {};
  departments.forEach(d => {
    deptMap[d._id] = d.name;
  });

  const deptCounts = {};
  employees.forEach(e => {
    if (e.status !== 'exited') {
      const deptName = e.department?.name || (e.department ? (deptMap[e.department] || 'Unassigned') : 'Unassigned');
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    }
  });

  const chartData = Object.entries(deptCounts).map(([name, count]) => ({
    name,
    employees: count,
  })).sort((a, b) => b.employees - a.employees);

  const finalChartData = chartData.length > 0 ? chartData : [
    { name: 'Engineering', employees: 0 },
    { name: 'Human Resources', employees: 0 }
  ];

  // Gender demographics
  const activeEmployees = employees.filter(e => e.status !== 'exited');
  const totalActive = activeEmployees.length || 1;
  const maleCount = activeEmployees.filter(e => e.gender === 'male').length;
  const femaleCount = activeEmployees.filter(e => e.gender === 'female').length;
  const otherCount = activeEmployees.filter(e => e.gender === 'other').length;
  const unspecifiedCount = activeEmployees.filter(e => !e.gender || e.gender === null).length;

  const malePercent = Math.round((maleCount / totalActive) * 100);
  const femalePercent = Math.round((femaleCount / totalActive) * 100);
  const otherPercent = Math.round((otherCount / totalActive) * 100);
  const unspecifiedPercent = Math.round((unspecifiedCount / totalActive) * 100);

  // Onboarding employees list
  const onboardingList = activeEmployees.filter(e => e.status === 'onboarding').slice(0, 5);
  // Recent hires list
  const recentHires = [...activeEmployees]
    .sort((a, b) => new Date(b.dateOfJoining || b.createdAt) - new Date(a.dateOfJoining || a.createdAt))
    .slice(0, 5);

  // Helper to get audit log tag style
  const getAuditStyle = (action) => {
    if (action.includes('FAIL') || action.includes('LOCK')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (action.includes('CREATE') || action.includes('REGISTER') || action.includes('APPROVE')) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  const cleanActionName = (action) => {
    return action.replace(/_/g, ' ').toLowerCase();
  };

  if (loading && !employees.length) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-crimson-500/30 border-t-crimson-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Syncing Operations Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 text-slate-200">
      
      {/* Header operations bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">Portal &gt; HR Operations</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            HR Control Center
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-crimson-500/10 border border-crimson-500/30 text-crimson-400">
              Operations Active
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {error && (
            <div className="text-xs text-crimson-400 flex items-center gap-1.5 bg-crimson-500/5 px-3 py-1.5 rounded-lg border border-crimson-500/10">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
          <button 
            onClick={loadData}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP SECTION TILES: Clock In/Out on Top */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        
        {/* PUNCH CARD TILES (Top-Left) */}
        <div className="md:col-span-7 glass-card p-6 bg-gradient-to-br from-noir-900/60 to-noir-950 border-crimson-500/15 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-crimson-500/5 rounded-full blur-[60px]" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                Muster Station
              </span>
              <h2 className="text-sm font-bold text-slate-300 mt-3">{currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
              <h1 className="text-4xl font-black text-white font-mono mt-1 tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h1>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                punchState === 'in' 
                  ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                  : punchState === 'completed' 
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
              }`}>
                ● {punchState === 'in' ? 'CLOCK IN ACTIVE' : punchState === 'completed' ? 'SHIFT COMPLETED' : 'CLOCKED OUT'}
              </span>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1.5 font-mono">
                Today: {todayRecord?.status ? todayRecord.status.replace('-', ' ') : 'no log'}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
            <p className="text-xs text-slate-400 font-medium">
              {getPunchStatusDetails()}
            </p>
            
            <button
              onClick={handlePunch}
              disabled={punchState === 'completed' || punching}
              className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all min-w-[150px] text-center ${
                punchState === 'completed'
                  ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                  : punchState === 'in'
                    ? 'bg-crimson-600/20 hover:bg-crimson-600/30 border border-crimson-500/40 text-crimson-400 shadow-inner'
                    : 'bg-crimson-600 hover:bg-crimson-500 text-white shadow-lg shadow-crimson-600/20'
              }`}
            >
              {punching ? 'Syncing...' : punchState === 'in' ? 'Punch Out' : punchState === 'completed' ? 'Shift Done' : 'Punch In'}
            </button>
          </div>
        </div>

        {/* PROFILE SUMMARY & SHIFT CARD */}
        <div className="md:col-span-5 glass-card p-6 bg-gradient-to-br from-crimson-900/40 to-noir-950 border border-crimson-500/20 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
          <div className="flex items-center gap-6 z-10">
            {/* Left side: Avatar */}
            <div className="shrink-0">
              <img 
                src={
                  user?.employee?.photo?.url || (
                    user?.employee?.gender === 'female' 
                      ? `https://avatar.iran.liara.run/public/girl?username=${user?.employee?.firstName}`
                      : user?.employee?.gender === 'male'
                        ? `https://avatar.iran.liara.run/public/boy?username=${user?.employee?.firstName}`
                        : `https://avatar.iran.liara.run/public/avatar?username=${user?.employee?.firstName}`
                  )
                } 
                alt="Profile Picture" 
                className="h-20 w-20 object-cover drop-shadow-[0_10px_20px_rgba(197,3,55,0.25)] bg-white/5 rounded-2xl border border-white/10 p-1"
              />
            </div>

            {/* Right side: Employee Data */}
            <div>
              <h3 className="text-xl font-bold text-white leading-tight">
                {user?.employee?.firstName} {user?.employee?.lastName}
              </h3>
              <p className="text-xs text-slate-350 mt-1">
                {user?.employee?.designation?.title || 'HR Specialist'} • {user?.employee?.department?.name || 'Human Resources'}
              </p>
              <p className="text-[10px] text-slate-550 font-bold font-mono tracking-wider mt-1.5">
                ID: {user?.employee?.employeeId}
              </p>
            </div>
          </div>

          {/* Bottom details: Active Shift & Attendance Rules */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 z-10">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">My Active Shift</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                {user?.employee?.shift?.startTime || '09:30'} - {user?.employee?.shift?.endTime || '18:30'}
              </p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Attendance Rules</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                Late mark: +{user?.employee?.shift?.graceMinutes || 15}m
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* METRICS ROW (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        
        {/* headcount */}
        <div className="glass-card p-5 bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Headcount</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{stats.headcount}</h1>
            </div>
            <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-4">
            Active members registered in tenant
          </p>
        </div>

        {/* present today */}
        <div className="glass-card p-5 bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Today</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{stats.presentToday}</h1>
            </div>
            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${stats.headcount ? (stats.presentToday / stats.headcount) * 100 : 0}%` }} 
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
              <span>Rate: {stats.headcount ? Math.round((stats.presentToday / stats.headcount) * 100) : 0}%</span>
              <span>Clocked</span>
            </div>
          </div>
        </div>

        {/* on leave */}
        <div className="glass-card p-5 bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Out on Leave</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{stats.onLeaveToday}</h1>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${stats.headcount ? (stats.onLeaveToday / stats.headcount) * 100 : 0}%` }} 
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
              <span>Absenteeism: {stats.headcount ? Math.round((stats.onLeaveToday / stats.headcount) * 100) : 0}%</span>
              <span>Approved</span>
            </div>
          </div>
        </div>

        {/* onboarding */}
        <div className="glass-card p-5 bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Onboarding</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{stats.onboarding}</h1>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-400">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-4">
            New profiles pending completion
          </p>
        </div>

        {/* pending approvals */}
        <div className="glass-card p-5 bg-gradient-to-br from-crimson-950/10 to-noir-950 border-crimson-500/15 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-crimson-500/5 rounded-full blur-2xl animate-pulse" />
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action Queue</p>
              <h1 className="text-4xl font-extrabold text-crimson-450 mt-1.5">{stats.pendingLeaves}</h1>
            </div>
            <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-400">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-crimson-400 font-bold uppercase tracking-wide mt-4 z-10">
            {stats.pendingLeaves > 0 ? '● Leaves awaiting review' : 'No pending leaves'}
          </p>
        </div>

      </div>

      {/* MAIN LAYOUT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT & CENTER PANEL (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Operations Quick Action Hub */}
          <div className="glass-card p-6 bg-noir-900/40">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Operations Quick Launch</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div 
                onClick={() => navigate('/dashboard/employees/new')}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-crimson-500/45 hover:bg-crimson-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[110px]"
              >
                <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-400 w-fit group-hover:scale-110 transition-transform duration-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Add New Employee</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Generate workspace credentials and invite</p>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard/directory')}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-crimson-500/45 hover:bg-crimson-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[110px]"
              >
                <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-400 w-fit group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Directory Manager</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Review active lists, org structures, and details</p>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard/reports')}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-crimson-500/45 hover:bg-crimson-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[110px]"
              >
                <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-400 w-fit group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Operational Reports</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Export headcount, attendance metrics, and LOPs</p>
                </div>
              </div>

            </div>
          </div>

          {/* Department Headcount Chart */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Demographics</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Headcount by Department</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                Active staff
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalChartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff10" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#ffffff10" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#02060E', borderColor: '#ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: '#ffffff03' }}
                  />
                  <Bar dataKey="employees" fill="#C50337" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Pending Leave Approvals Manager */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approvals Center</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Pending Leave Approvals</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-crimson-500/10 border border-crimson-500/20 text-crimson-400">
                {pendingRequests.length} pending
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Queue completely cleared!</h4>
                <p className="text-[10px] text-slate-500 mt-1">No pending leave requests require action.</p>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-5">Employee</th>
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3 px-5">Period</th>
                      <th className="py-3 px-5">Reason</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-5">
                          <p className="text-sm font-bold text-white">
                            {req.employee?.firstName} {req.employee?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
                            {req.employee?.employeeId}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-slate-300">
                            {req.leaveType?.name || 'Leave'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-xs text-slate-200 font-semibold">
                            {req.from} → {req.to}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                            {req.days} Day(s) {req.isLOP && <span className="text-crimson-400 font-extrabold">(LOP)</span>}
                          </p>
                        </td>
                        <td className="py-4 px-5 max-w-[150px] truncate text-xs text-slate-400">
                          {req.reason || 'No reason provided'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={actionPending[req._id]}
                              onClick={() => {
                                setActiveRequest(req);
                                setModalAction('approve');
                              }}
                              className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
                              title="Approve request"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              disabled={actionPending[req._id]}
                              onClick={() => {
                                setActiveRequest(req);
                                setModalAction('reject');
                              }}
                              className="w-8 h-8 rounded-xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 hover:bg-crimson-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
                              title="Reject request"
                            >
                               <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Gender Diversity Breakdown */}
          <div className="glass-card p-6 bg-noir-900/40">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Demographics</p>
            <h3 className="text-lg font-bold text-white mt-0.5 mb-6">Gender Diversity</h3>

            <div className="space-y-4">
              
              {/* Male ratio */}
              <div className="bg-white/[0.01] rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-300">Male Employees</span>
                  <span className="text-sm font-bold text-white">
                    {maleCount} <span className="text-[10px] text-slate-500 font-normal">({malePercent}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-noir rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${malePercent}%` }} />
                </div>
              </div>

              {/* Female ratio */}
              <div className="bg-white/[0.01] rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-300">Female Employees</span>
                  <span className="text-sm font-bold text-white">
                    {femaleCount} <span className="text-[10px] text-slate-500 font-normal">({femalePercent}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-noir rounded-full overflow-hidden">
                  <div className="h-full bg-crimson-500" style={{ width: `${femalePercent}%` }} />
                </div>
              </div>

              {/* Other/Unspecified ratio */}
              {(otherCount > 0 || unspecifiedCount > 0) && (
                <div className="bg-white/[0.01] rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300">Other / Unspecified</span>
                    <span className="text-sm font-bold text-white">
                      {otherCount + unspecifiedCount} <span className="text-[10px] text-slate-500 font-normal">({otherPercent + unspecifiedPercent}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-noir rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500" style={{ width: `${otherPercent + unspecifiedPercent}%` }} />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Onboarding Pipeline & Recent Hires (Carousel/Card) */}
          <div className="glass-card p-6 bg-noir-900/40">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lifecycle</p>
            <h3 className="text-lg font-bold text-white mt-0.5 mb-6">Recent Hires</h3>

            <div className="space-y-4">
              {recentHires.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">No employees found.</div>
              ) : (
                recentHires.map((emp) => (
                  <div 
                    key={emp._id} 
                    onClick={() => navigate(`/dashboard/employees/${emp._id}`)}
                    className="flex gap-4 items-center p-2 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors cursor-pointer group"
                  >
                    {emp.photo?.url ? (
                      <img src={emp.photo.url} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-crimson-500/10 border border-crimson-500/25 flex items-center justify-center font-bold text-crimson-450 shrink-0 uppercase text-sm">
                        {emp.firstName[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs leading-snug group-hover:text-crimson-400 transition-colors truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">
                        {emp.designation?.title || 'Software Engineer'} • {emp.department?.name || 'Engineering'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time System Audit Trail */}
          <div className="glass-card p-6 bg-noir-900/40 flex-1 flex flex-col">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Log</p>
            <h3 className="text-lg font-bold text-white mt-0.5 mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4 text-crimson-450" /> System Audit Trail
            </h3>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-2 hide-scrollbar">
              {auditFeed.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">No audit logs found.</div>
              ) : (
                auditFeed.slice(0, 7).map((log) => (
                  <div key={log._id} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${getAuditStyle(log.action)}`}>
                        {cleanActionName(log.action)}
                      </span>
                      <span className="text-[8px] font-bold font-mono text-slate-650">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-2 font-medium">
                      User: <b className="text-slate-400">{log.user?.email || 'System'}</b>
                    </p>
                    {log.details && (
                      <p className="text-[9px] text-slate-550 mt-1 font-mono italic">
                        {typeof log.details === 'object'
                          ? (log.details.exitReason
                              ? `Reason: ${log.details.exitReason}`
                              : (log.details.fields
                                  ? `Fields: ${log.details.fields.join(', ')}`
                                  : JSON.stringify(log.details)
                                )
                            )
                          : log.details
                        }
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* CUSTOM GLASSMORPHIC APPROVAL ACTION MODAL */}
      <AnimatePresence>
        {activeRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-noir-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-left"
            >
              {/* Glowing accent background */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-crimson-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-crimson-500" />
                  {modalAction === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                </h3>
                <button 
                  onClick={() => {
                    setActiveRequest(null);
                    setModalComment('');
                  }}
                  className="p-1 rounded bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Request Data summary */}
              <div className="mb-5 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <p className="text-xs text-slate-400">
                  <strong className="text-white">Employee:</strong> {activeRequest.employee?.firstName} {activeRequest.employee?.lastName}
                </p>
                <p className="text-xs text-slate-400">
                  <strong className="text-white">Leave Type:</strong> {activeRequest.leaveType?.name || 'Leave'}
                </p>
                <p className="text-xs text-slate-400">
                  <strong className="text-white">Period:</strong> {activeRequest.from} to {activeRequest.to} ({activeRequest.days} days)
                </p>
                {activeRequest.reason && (
                  <p className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg italic border border-white/5 mt-2">
                    "{activeRequest.reason}"
                  </p>
                )}
              </div>

              {/* Input for comments */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approver Comment (Optional)</label>
                <textarea
                  value={modalComment}
                  onChange={(e) => setModalComment(e.target.value)}
                  placeholder="Enter remarks for the employee..."
                  rows={3}
                  className="w-full bg-noir-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-crimson-500 transition-colors resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setActiveRequest(null);
                    setModalComment('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={actionPending[activeRequest._id]}
                  onClick={submitLeaveAction}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow ${
                    modalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-500 shadow-green-600/10'
                      : 'bg-crimson-600 hover:bg-crimson-500 shadow-crimson-600/10'
                  }`}
                >
                  {actionPending[activeRequest._id] ? (
                    'Processing...'
                  ) : (
                    <>
                      {modalAction === 'approve' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      Confirm {modalAction === 'approve' ? 'Approval' : 'Rejection'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
