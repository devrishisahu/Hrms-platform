import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Clock, AlertTriangle, CalendarCheck, CheckSquare, 
  TrendingUp, RefreshCw, Check, X, AlertCircle, Calendar, 
  UserCheck, Trash2, Plus, Megaphone, ClipboardList, Send, ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as ep from '../../api/endpoints';

export default function ManagerDashboard() {
  const user = useSelector((state) => state.auth?.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [teamAttToday, setTeamAttToday] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingRegularizations, setPendingRegularizations] = useState([]);
  const [error, setError] = useState('');
  
  // Own attendance state (Manager's Punch Station)
  const [myRecords, setMyRecords] = useState([]);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Interactive filtering state for roster list
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'present', 'leave', 'approvals', 'anomalies'
  
  // Interactive Notebook state
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('manager_tasks');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Review team leave applications for next week', done: false },
      { id: 2, text: 'Audit attendance regularization justifications', done: false },
      { id: 3, text: 'Schedule monthly engineering 1:1 checkins', done: false }
    ];
  });
  const [newTaskText, setNewTaskText] = useState('');

  // Interactive Announcement state
  const [announcement, setAnnouncement] = useState(() => {
    return localStorage.getItem('manager_announcement') || 'Sprint milestone 2 review is scheduled for Thursday. Please update your tickets!';
  });
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [newAnnText, setNewAnnText] = useState('');

  // Chart state
  const [chartType, setChartType] = useState('avgHours'); // 'avgHours' | 'overtime'

  // Custom modal state for leaves/regularizations approvals
  const [activeRequest, setActiveRequest] = useState(null); // null or { type: 'leave'|'regularization', data: reqObject }
  const [modalComment, setModalComment] = useState('');
  const [modalAction, setModalAction] = useState(''); // 'approve' | 'reject'
  const [actionPending, setActionPending] = useState({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('manager_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const [teamRes, attTodayRes, leaveRes, regRes, myAttRes] = await Promise.all([
        ep.myTeam(),
        ep.teamAttendance(), // defaults to today
        ep.leaveRequests('pending'),
        ep.listRegularizations('pending'),
        ep.myAttendance(currentMonth)
      ]);

      setTeam(teamRes.data?.data?.team || []);
      setTeamAttToday(attTodayRes.data?.data?.records || []);
      setPendingLeaves(leaveRes.data?.data?.requests || []);
      setPendingRegularizations(regRes.data?.data?.requests || []);
      setMyRecords(myAttRes.data?.data?.records || []);
    } catch (err) {
      console.error('Failed to load Manager Dashboard data:', err);
      setError('Error syncing team operations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Manager's own punch calculations
  const timezone = user?.tenant?.settings?.timezone || 'Asia/Kolkata';

  const getTodayStr = () => {
    const localDateStr = new Date().toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const [m, d, y] = localDateStr.split('/');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();
  const myTodayRecord = myRecords.find(r => r.date === todayStr);

  const getPunchState = () => {
    if (!myTodayRecord || !myTodayRecord.punchIn) return 'out';
    if (myTodayRecord.punchIn && !myTodayRecord.punchOut) return 'in';
    return 'completed';
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
    if (punchState === 'in') return `Clocked in at ${fmt(myTodayRecord.punchIn)}. Active shift running.`;
    return `Completed shift today. In: ${fmt(myTodayRecord.punchIn)} | Out: ${fmt(myTodayRecord.punchOut)}.`;
  };

  // Submit leave action from custom modal
  const submitLeaveAction = async () => {
    if (!activeRequest) return;
    const { _id } = activeRequest.data;
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

  // Submit regularization action from custom modal
  const submitRegAction = async () => {
    if (!activeRequest) return;
    const { _id } = activeRequest.data;
    setActionPending(prev => ({ ...prev, [_id]: true }));
    try {
      await ep.actRegularization(_id, { action: modalAction, comment: modalComment });
      await loadData();
      setActiveRequest(null);
      setModalComment('');
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${modalAction} regularization request.`);
    } finally {
      setActionPending(prev => ({ ...prev, [_id]: false }));
    }
  };

  // Team calculations
  const teamSize = team.length || 0;
  const presentCount = teamAttToday.filter(r => ['present', 'late', 'half-day'].includes(r.status)).length;
  const onLeaveCount = teamAttToday.filter(r => r.status === 'on-leave').length;
  const pendingApprovalsCount = pendingLeaves.length + pendingRegularizations.length;
  const attendanceRate = teamSize ? Math.round((presentCount / teamSize) * 100) : 0;
  const anomalyCount = teamAttToday.filter(r => r.status === 'absent' || r.status === 'late').length;

  // Roster filtering logic
  const filteredTeam = team.filter(emp => {
    if (filterStatus === 'all') return true;
    const record = teamAttToday.find(r => r.employee?._id === emp._id || r.employee === emp._id);
    const status = record?.status || 'absent';
    
    if (filterStatus === 'present') return ['present', 'late', 'half-day'].includes(status);
    if (filterStatus === 'leave') return status === 'on-leave';
    if (filterStatus === 'anomalies') return ['absent', 'late'].includes(status);
    if (filterStatus === 'approvals') {
      const hasLeave = pendingLeaves.some(l => (l.employee?._id || l.employee) === emp._id);
      const hasReg = pendingRegularizations.some(r => (r.employee?._id || r.employee) === emp._id);
      return hasLeave || hasReg;
    }
    return true;
  });

  // Productivity Mock (using realistic dynamic averages)
  const teamAvgHours = teamAttToday.length > 0 
    ? Number((teamAttToday.reduce((s, r) => s + (r.workedMinutes || 0), 0) / (teamAttToday.length * 60)).toFixed(1))
    : 8.2;

  const productivityData = [
    { day: 'Mon', teamAvg: 8.2, overtime: 0.5 },
    { day: 'Tue', teamAvg: 8.5, overtime: 0.8 },
    { day: 'Wed', teamAvg: 7.9, overtime: 0.2 },
    { day: 'Thu', teamAvg: teamAvgHours > 0 ? teamAvgHours : 8.1, overtime: teamAvgHours > 8 ? Number((teamAvgHours - 8).toFixed(1)) : 0.1 },
    { day: 'Fri', teamAvg: 8.3, overtime: 0.6 }
  ];

  // Notebook functions
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText.trim(), done: false }]);
    setNewTaskText('');
  };

  const handleToggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Announcement functions
  const handlePostAnn = (e) => {
    e.preventDefault();
    if (!newAnnText.trim()) return;
    setAnnouncement(newAnnText.trim());
    localStorage.setItem('manager_announcement', newAnnText.trim());
    setNewAnnText('');
    setShowAnnForm(false);
  };

  if (loading && !team.length) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-crimson-500/30 border-t-crimson-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Loading Team Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 text-slate-200 relative">
      
      {/* Announcement Alert Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-crimson-950/20 via-noir-950 to-crimson-950/20 border border-crimson-500/30 flex items-center justify-between gap-4 shadow-lg shadow-crimson-500/5 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-2 h-full bg-crimson-500" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 bg-crimson-500/20 rounded-xl border border-crimson-500/30 text-crimson-450 shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-[9px] font-bold text-crimson-400 uppercase tracking-widest block mb-0.5">Team Broadcast</span>
            <p className="text-sm text-slate-205 font-medium">"{announcement}"</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setNewAnnText(announcement);
            setShowAnnForm(!showAnnForm);
          }}
          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all relative z-10 shrink-0 hover:border-crimson-500/30"
        >
          {showAnnForm ? 'Cancel' : 'Update'}
        </button>
      </motion.div>

      {/* Announcement Update Drawer */}
      <AnimatePresence>
        {showAnnForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handlePostAnn}
            className="mb-8 p-5 rounded-2xl bg-noir-950 border border-white/5 space-y-4 overflow-hidden"
          >
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-crimson-500" /> Broadcast New Announcement
            </h4>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={newAnnText}
                onChange={(e) => setNewAnnText(e.target.value)}
                placeholder="Type your message for the team here..."
                className="flex-1 bg-noir-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-crimson-500 transition-colors"
                maxLength={180}
              />
              <button 
                type="submit"
                className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-crimson-600/10"
              >
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="text-left">
          <p className="text-xs text-slate-500 font-medium mb-1">Portal &gt; Team Operations</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Team Hub
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-crimson-500/10 border border-crimson-500/30 text-crimson-405">
              Manager Center
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

      {/* TOP SECTION TILES: Punch Clock & Profile Info */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        
        {/* PUNCH CARD (Top-Left) */}
        <div className="md:col-span-7 glass-card p-6 bg-gradient-to-br from-noir-900/60 to-noir-950 border border-white/5 hover:border-crimson-500/20 relative overflow-hidden flex flex-col justify-between min-h-[200px] text-left">
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
                Today: {myTodayRecord?.status ? myTodayRecord.status.replace('-', ' ') : 'no log'}
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

        {/* PROFILE SUMMARY & SHIFT DETAILS */}
        <div className="md:col-span-5 glass-card p-6 bg-gradient-to-br from-crimson-900/40 to-noir-950 border border-crimson-500/20 relative overflow-hidden flex flex-col justify-between min-h-[200px] text-left">
          <div className="flex items-center gap-6 z-10">
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

            <div>
              <h3 className="text-xl font-bold text-white leading-tight">
                {user?.employee?.firstName} {user?.employee?.lastName}
              </h3>
              <p className="text-xs text-slate-350 mt-1">
                {user?.employee?.designation?.title || 'Manager'} • {user?.employee?.department?.name || 'Operations'}
              </p>
              <p className="text-[10px] text-slate-550 font-bold font-mono tracking-wider mt-1.5">
                ID: {user?.employee?.employeeId}
              </p>
            </div>
          </div>

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

      {/* SNAPSHOT METRICS ROW (5 Cards) - INTERACTIVE FILTER TRIGGERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        
        {/* team size */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={`glass-card p-5 relative flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-300 text-left ${
            filterStatus === 'all' 
              ? 'bg-gradient-to-br from-crimson-950/20 to-noir-950 border-crimson-500/40 shadow-md shadow-crimson-500/5 ring-1 ring-crimson-500/20 scale-[1.02]' 
              : 'bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Team Size</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{teamSize}</h1>
            </div>
            <div className={`p-2 rounded-xl border transition-colors ${
              filterStatus === 'all' 
                ? 'bg-crimson-500/20 border-crimson-500/30 text-crimson-400' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-4">
            {filterStatus === 'all' ? '● FILTERING: ALL' : 'Click to show all'}
          </p>
        </div>

        {/* present today */}
        <div 
          onClick={() => setFilterStatus('present')}
          className={`glass-card p-5 relative flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-300 text-left ${
            filterStatus === 'present' 
              ? 'bg-gradient-to-br from-green-950/20 to-noir-950 border-green-500/40 shadow-md shadow-green-500/5 ring-1 ring-green-500/20 scale-[1.02]' 
              : 'bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Today</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{presentCount}</h1>
            </div>
            <div className={`p-2 rounded-xl border transition-colors ${
              filterStatus === 'present' 
                ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${teamSize ? (presentCount / teamSize) * 100 : 0}%` }} 
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
              <span>{filterStatus === 'present' ? '● PRESENT FILTER' : 'Click to filter'}</span>
              <span className="text-white">{attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* on leave */}
        <div 
          onClick={() => setFilterStatus('leave')}
          className={`glass-card p-5 relative flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-300 text-left ${
            filterStatus === 'leave' 
              ? 'bg-gradient-to-br from-blue-950/20 to-noir-950 border-blue-500/40 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20 scale-[1.02]' 
              : 'bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">On Leave</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{onLeaveCount}</h1>
            </div>
            <div className={`p-2 rounded-xl border transition-colors ${
              filterStatus === 'leave' 
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-4">
            {filterStatus === 'leave' ? '● LEAVE FILTER' : 'Click to filter'}
          </p>
        </div>

        {/* pending approvals */}
        <div 
          onClick={() => setFilterStatus('approvals')}
          className={`glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-300 text-left ${
            filterStatus === 'approvals' 
              ? 'bg-gradient-to-br from-crimson-950/30 to-noir-950 border-crimson-500/50 shadow-md shadow-crimson-500/10 ring-1 ring-crimson-500/30 scale-[1.02]' 
              : 'bg-gradient-to-br from-noir-900 to-noir-950 border-crimson-500/15 hover:border-crimson-500/30 hover:bg-white/[0.02]'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-crimson-500/5 rounded-full blur-2xl animate-pulse" />
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Queue Items</p>
              <h1 className="text-4xl font-extrabold text-crimson-450 mt-1.5">{pendingApprovalsCount}</h1>
            </div>
            <div className={`p-2 rounded-xl border transition-colors ${
              filterStatus === 'approvals' 
                ? 'bg-crimson-500/20 border-crimson-500/40 text-crimson-400' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[9px] text-crimson-400 font-bold uppercase tracking-wide mt-4 z-10">
            {filterStatus === 'approvals' ? '● APPROVALS FILTER' : 'Click to filter'}
          </p>
        </div>

        {/* team alert */}
        <div 
          onClick={() => setFilterStatus('anomalies')}
          className={`glass-card p-5 relative flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-300 text-left ${
            filterStatus === 'anomalies' 
              ? 'bg-gradient-to-br from-yellow-950/20 to-noir-950 border-yellow-500/40 shadow-md shadow-yellow-500/5 ring-1 ring-yellow-500/20 scale-[1.02]' 
              : 'bg-gradient-to-br from-noir-900 to-noir-950 border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Anomalies</p>
              <h1 className="text-4xl font-extrabold text-white mt-1.5">{anomalyCount}</h1>
            </div>
            <div className={`p-2 rounded-xl border transition-colors ${
              filterStatus === 'anomalies' 
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-4">
            {filterStatus === 'anomalies' ? '● ANOMALY FILTER' : 'Click to filter'}
          </p>
        </div>

      </div>

      {/* CORE GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Approvals & Analytics */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Quick Manager Actions */}
          <div className="glass-card p-6 bg-noir-900/40 text-left">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-sans">Manager Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div 
                onClick={() => navigate('/dashboard/approvals')}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-crimson-500/45 hover:bg-crimson-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[110px]"
              >
                <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-450 w-fit group-hover:scale-110 transition-transform duration-300">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Review Pending Actions</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Process leaves and regularizations</p>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard/directory')}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-crimson-500/45 hover:bg-crimson-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[110px]"
              >
                <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-450 w-fit group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Team Roster Directory</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Browse team profiles and statutory summaries</p>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard/attendance')}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-crimson-500/45 hover:bg-crimson-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[110px]"
              >
                <div className="p-2 bg-crimson-500/10 rounded-xl border border-crimson-500/20 text-crimson-450 w-fit group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Attendance Logbook</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Inspect worked hours and calendar sheets</p>
                </div>
              </div>

            </div>
          </div>

          {/* Productivity Chart with Interactive Toggles */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="flex items-center justify-between mb-6">
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Team Activity</p>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-crimson-500" />
                  {chartType === 'avgHours' ? 'Team Productivity (Avg Hours)' : 'Overtime Logged (Hours)'}
                </h3>
              </div>
              <div className="flex bg-white/5 border border-white/5 rounded-xl p-0.5">
                <button
                  onClick={() => setChartType('avgHours')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    chartType === 'avgHours' ? 'bg-crimson-600 text-white shadow font-sans' : 'text-slate-400 hover:text-white font-sans'
                  }`}
                >
                  Hours Worked
                </button>
                <button
                  onClick={() => setChartType('overtime')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    chartType === 'overtime' ? 'bg-crimson-600 text-white shadow font-sans' : 'text-slate-400 hover:text-white font-sans'
                  }`}
                >
                  Overtime
                </button>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartType === 'avgHours' ? '#C50337' : '#eab308'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartType === 'avgHours' ? '#C50337' : '#eab308'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="day" stroke="#ffffff10" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff10" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} domain={chartType === 'avgHours' ? [0, 10] : [0, 2]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#02060E', borderColor: '#ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartType === 'avgHours' ? 'teamAvg' : 'overtime'} 
                    stroke={chartType === 'avgHours' ? '#C50337' : '#eab308'} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorAvg)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pending Approvals Manager (Leaves + Regularizations) */}
          <div className="glass-card p-6 bg-noir-900/40 text-left">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Queue Center</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Team Pending Approvals</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-crimson-500/10 border border-crimson-500/20 text-crimson-450">
                {pendingApprovalsCount} pending
              </span>
            </div>

            {pendingApprovalsCount === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Approvals queue cleared!</h4>
                <p className="text-[10px] text-slate-500 mt-1">No pending team leaves or time corrections require actions.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Pending Leaves Table */}
                {pendingLeaves.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Leave Requests</h4>
                    <div className="overflow-x-auto min-w-full">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-4">Employee</th>
                            <th className="py-2.5 px-4">Type</th>
                            <th className="py-2.5 px-4">Period</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingLeaves.map((req) => (
                            <tr key={req._id} className="hover:bg-white/[0.01]">
                              <td className="py-3 px-4 text-sm font-bold text-white">
                                {req.employee?.firstName} {req.employee?.lastName}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-slate-300">
                                  {req.leaveType?.name}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-300">
                                {req.from} → {req.to} ({req.days}d)
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    disabled={actionPending[req._id]}
                                    onClick={() => {
                                      setActiveRequest({ type: 'leave', data: req });
                                      setModalAction('approve');
                                    }}
                                    className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center animate-pulse"
                                    title="Approve Leave"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={actionPending[req._id]}
                                    onClick={() => {
                                      setActiveRequest({ type: 'leave', data: req });
                                      setModalAction('reject');
                                    }}
                                    className="w-7 h-7 rounded-lg bg-crimson-500/10 border border-crimson-500/20 text-crimson-450 hover:bg-crimson-500 hover:text-white transition-all flex items-center justify-center"
                                    title="Reject Leave"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pending Regularizations Table */}
                {pendingRegularizations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Attendance Corrections</h4>
                    <div className="overflow-x-auto min-w-full">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-4">Employee</th>
                            <th className="py-2.5 px-4">Date</th>
                            <th className="py-2.5 px-4">Correction Time</th>
                            <th className="py-2.5 px-4">Reason</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingRegularizations.map((req) => {
                            const fmtT = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone });
                            return (
                              <tr key={req._id} className="hover:bg-white/[0.01]">
                                <td className="py-3 px-4 text-sm font-bold text-white">
                                  {req.employee?.firstName} {req.employee?.lastName}
                                </td>
                                <td className="py-3 px-4 text-xs font-mono text-slate-300">
                                  {req.date}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-200">
                                  In: {fmtT(req.requestedPunchIn)} | Out: {fmtT(req.requestedPunchOut)}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-400 max-w-[120px] truncate">
                                  {req.reason}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      disabled={actionPending[req._id]}
                                      onClick={() => {
                                        setActiveRequest({ type: 'regularization', data: req });
                                        setModalAction('approve');
                                      }}
                                      className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center animate-pulse"
                                      title="Approve Regularization"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={actionPending[req._id]}
                                      onClick={() => {
                                        setActiveRequest({ type: 'regularization', data: req });
                                        setModalAction('reject');
                                      }}
                                      className="w-7 h-7 rounded-lg bg-crimson-500/10 border border-crimson-500/20 text-crimson-455 hover:bg-crimson-500 hover:text-white transition-all flex items-center justify-center"
                                      title="Reject Regularization"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Team Live Presence Tracker & Notebook & Schedule */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Team Live Presence Tracker (With Interactive Filtering Header) */}
          <div className="glass-card p-6 bg-noir-900/40 text-left">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Muster Presence</p>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-crimson-450" /> Team Attendance
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider capitalize ${
                filterStatus === 'all' 
                  ? 'bg-white/5 border border-white/10 text-slate-300'
                  : filterStatus === 'present'
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : filterStatus === 'leave'
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                      : filterStatus === 'anomalies'
                        ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                        : 'bg-crimson-500/10 border border-crimson-500/20 text-crimson-400'
              }`}>
                {filterStatus}
              </span>
            </div>

            {filterStatus !== 'all' && (
              <p className="text-[9px] text-slate-500 font-medium mb-3 cursor-pointer hover:text-crimson-400 flex items-center gap-1" onClick={() => setFilterStatus('all')}>
                <span>Showing filtered roster.</span> 
                <span className="underline font-bold text-crimson-500">Reset filter</span>
              </p>
            )}

            <div className="space-y-4 max-h-[290px] overflow-y-auto pr-2 hide-scrollbar">
              {filteredTeam.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-white/5 rounded-xl">
                  No team members match the filter criteria.
                </div>
              ) : (
                filteredTeam.map((emp) => {
                  const record = teamAttToday.find(r => r.employee?._id === emp._id || r.employee === emp._id);
                  const status = record?.status || 'absent';
                  
                  let statusText = 'Absent';
                  let statusBadgeStyle = 'text-red-400 bg-red-500/10 border-red-500/20';
                  
                  if (status === 'present') {
                    statusText = 'Present';
                    statusBadgeStyle = 'text-green-400 bg-green-500/10 border-green-500/20';
                  } else if (status === 'late') {
                    statusText = 'Late';
                    statusBadgeStyle = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                  } else if (status === 'half-day') {
                    statusText = 'Half Day';
                    statusBadgeStyle = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                  } else if (status === 'on-leave') {
                    statusText = 'Leave';
                    statusBadgeStyle = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                  }
                  
                  const fmtT = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone });
                  const checkInTime = record?.punchIn ? `In: ${fmtT(record.punchIn)}` : '';
                  const checkOutTime = record?.punchOut ? ` | Out: ${fmtT(record.punchOut)}` : '';

                  return (
                    <motion.div 
                      layout
                      key={emp._id}
                      onClick={() => navigate(`/dashboard/employees/${emp._id}`)}
                      className="flex gap-4 items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        {emp.photo?.url ? (
                          <img src={emp.photo.url} alt="" className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-crimson-500/10 border border-crimson-500/25 flex items-center justify-center font-bold text-crimson-450 shrink-0 uppercase text-xs">
                            {emp.firstName[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs leading-none group-hover:text-crimson-400 transition-colors truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-1 truncate">
                            {checkInTime ? `${checkInTime}${checkOutTime}` : emp.designation?.title || 'Engineer'}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0 ${statusBadgeStyle}`}>
                        {statusText}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Manager Notebook / Task list (New Interactive Tile) */}
          <div className="glass-card p-6 bg-noir-900/40 text-left">
            <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-crimson-450" /> Manager's Notebook
            </h3>
            
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Write a personal note or reminder..."
                className="flex-1 bg-noir-950 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-650 focus:outline-none focus:border-crimson-500 transition-colors"
              />
              <button 
                type="submit"
                className="p-2 bg-crimson-600 hover:bg-crimson-500 rounded-xl text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 hide-scrollbar">
              {tasks.length === 0 ? (
                <div className="text-center py-4 text-slate-600 text-xs">No pending notes. All caught up!</div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl group transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input 
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleTask(task.id)}
                        className="w-3.5 h-3.5 accent-crimson-500 cursor-pointer rounded bg-noir border-white/10 shrink-0"
                      />
                      <span className={`text-xs truncate transition-all ${
                        task.done ? 'line-through text-slate-600 opacity-60' : 'text-slate-300'
                      }`}>
                        {task.text}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-600 hover:text-crimson-400 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Schedule */}
          <div className="glass-card p-6 bg-noir-900/40 text-left">
            <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider mb-6 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-crimson-450" /> Team Schedule & Events
            </h3>
            <div className="space-y-4">
              <div className="p-3.5 border-l-2 border-crimson-500 bg-crimson-500/5 rounded-r-xl">
                <p className="text-xs font-bold text-white mb-1">Sprint Sync & Standup</p>
                <p className="text-[10px] text-slate-400">10:00 AM - 10:30 AM</p>
              </div>
              <div className="p-3.5 border-l-2 border-white/20 bg-white/5 rounded-r-xl">
                <p className="text-xs font-bold text-white mb-1">Quarterly Performance 1:1s</p>
                <p className="text-[10px] text-slate-400">02:00 PM - 04:00 PM</p>
              </div>
              <div className="p-3.5 border-l-2 border-white/20 bg-white/5 rounded-r-xl">
                <p className="text-xs font-bold text-white mb-1">Architecture Design Review</p>
                <p className="text-[10px] text-slate-400">04:30 PM - 05:30 PM</p>
              </div>
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
                  {modalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
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
                  <strong className="text-white">Employee:</strong> {activeRequest.data.employee?.firstName} {activeRequest.data.employee?.lastName}
                </p>
                {activeRequest.type === 'leave' ? (
                  <>
                    <p className="text-xs text-slate-400">
                      <strong className="text-white">Leave Type:</strong> {activeRequest.data.leaveType?.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong className="text-white">Period:</strong> {activeRequest.data.from} to {activeRequest.data.to} ({activeRequest.data.days} days)
                    </p>
                    {activeRequest.data.reason && (
                      <p className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg italic border border-white/5 mt-2">
                        "{activeRequest.data.reason}"
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      <strong className="text-white">Regularization Date:</strong> {activeRequest.data.date}
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong className="text-white">Times Requested:</strong> In: {new Date(activeRequest.data.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })} | Out: {new Date(activeRequest.data.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
                    </p>
                    {activeRequest.data.reason && (
                      <p className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg italic border border-white/5 mt-2">
                        "{activeRequest.data.reason}"
                      </p>
                    )}
                  </>
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-350 border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={actionPending[activeRequest.data._id]}
                  onClick={activeRequest.type === 'leave' ? submitLeaveAction : submitRegAction}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow ${
                    modalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-500 shadow-green-600/10'
                      : 'bg-crimson-600 hover:bg-crimson-500 shadow-crimson-600/10'
                  }`}
                >
                  {actionPending[activeRequest.data._id] ? (
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
