import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Clock, Calendar, ChevronRight, Upload, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as ep from '../../api/endpoints';

const statusColors = {
  'present': 'bg-green-500/25 text-green-400 border-green-500/35 hover:bg-green-500/40',
  'late': 'bg-yellow-500/25 text-yellow-400 border-yellow-500/35 hover:bg-yellow-500/40',
  'half-day': 'bg-amber-500/25 text-amber-400 border-amber-500/35 hover:bg-amber-500/40',
  'absent': 'bg-red-500/25 text-red-400 border-red-500/35 hover:bg-red-500/40',
  'on-leave': 'bg-blue-500/25 text-blue-400 border-blue-500/35 hover:bg-blue-500/40',
  'holiday': 'bg-purple-500/25 text-purple-400 border-purple-500/35 hover:bg-purple-500/40',
  'weekly-off': 'bg-white/5 text-slate-500 border-white/5 opacity-60',
  'pending': 'bg-white/[0.02] text-slate-500 border-white/5',
};

export default function EmployeeDashboard() {
  const user = useSelector((state) => state.auth?.user);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [balances, setBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  
  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const [attRes, balRes, holRes] = await Promise.all([
        ep.myAttendance(currentMonth),
        ep.myBalances(),
        ep.orgList('holidays'),
      ]);

      setRecords(attRes.data.data.records || []);
      setSummary(attRes.data.data.summary || {});
      setBalances(balRes.data.data || []);
      setHolidays(holRes.data.data || []);
    } catch (err) {
      console.error('Failed to load employee dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const timezone = user?.tenant?.settings?.timezone || 'Asia/Kolkata';

  // Format today's date in tenant timezone
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
      await loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to punch ${type}`);
    } finally {
      setPunching(false);
    }
  };

  // Calendar logic
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentTime.toLocaleString('default', { month: 'long' });
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  const paddingDaysCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const calendarDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = records.find(r => r.date === dateStr);
    
    let status = 'pending';
    let label = '';
    
    if (record) {
      status = record.status;
      const fmtTime = (t) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone }) : '';
      if (record.punchIn) {
        label = `In: ${fmtTime(record.punchIn)}`;
        if (record.punchOut) {
          label += ` | Out: ${fmtTime(record.punchOut)}`;
        }
      }
    } else {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        status = 'weekly-off';
      } else {
        const isHoliday = holidays.some(h => {
          const hDate = new Date(h.date);
          return hDate.getFullYear() === year && hDate.getMonth() === month && hDate.getDate() === day;
        });
        if (isHoliday) {
          status = 'holiday';
        } else if (d < new Date()) {
          status = 'absent';
        }
      }
    }
    
    calendarDays.push({ day, dateStr, status, label });
  }

  // Worked hours chart preparation
  const chartData = records
    .filter(r => r.punchIn && r.workedMinutes > 0)
    .slice(-6)
    .map(r => ({
      name: r.date.slice(5), // "MM-DD"
      hours: Number((r.workedMinutes / 60).toFixed(1)),
    }));

  const finalChartData = chartData.length > 0 ? chartData : [
    { name: 'Mon', hours: 0 },
    { name: 'Tue', hours: 0 },
    { name: 'Wed', hours: 0 },
    { name: 'Thu', hours: 0 },
    { name: 'Fri', hours: 0 },
  ];

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const leaveColors = {
    'Casual Leave': 'bg-blue-500',
    'Sick Leave': 'bg-crimson-500',
    'Earned Leave': 'bg-green-500',
  };

  const calculateProfileCompletion = () => {
    const emp = user?.employee;
    if (!emp) return { percent: 0, completedSteps: 0, totalSteps: 5 };
    
    let completedSteps = 0;
    const totalSteps = 5;
    
    if (emp.firstName && emp.gender && emp.dateOfBirth) completedSteps++;
    if (emp.phone || emp.personalEmail) completedSteps++;
    if (emp.bank?.accountNumber || emp.bank?.bankName) completedSteps++;
    if (emp.statutory?.aadhaar || emp.statutory?.pan) completedSteps++;
    if (emp.photo?.url) completedSteps++;
    
    const percent = Math.round((completedSteps / totalSteps) * 100);
    return { percent, completedSteps, totalSteps };
  };
  const { percent, completedSteps, totalSteps } = calculateProfileCompletion();

  const getPunchStatusDetails = () => {
    const fmt = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone });
    if (punchState === 'out') return 'Not clocked in yet today.';
    if (punchState === 'in') return `Clocked in at ${fmt(todayRecord.punchIn)}. Active shift running.`;
    return `Completed shift today. In: ${fmt(todayRecord.punchIn)} | Out: ${fmt(todayRecord.punchOut)}.`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Syncing Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 text-slate-200">
      


      {/* Header breadcrumbs & greetings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">Portal &gt; Dashboard</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Good morning, {user?.employee?.firstName || 'User'}
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-crimson-400" />
            <span>{currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
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

        {/* PROFILE SUMMARY & SHIFT CARD (Redesigned with Gender Avatar + Employee Data) */}
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
              <p className="text-xs text-slate-300 mt-1">
                {user?.employee?.designation?.title || 'Software Engineer'} • {user?.employee?.department?.name || 'Engineering'}
              </p>
              <p className="text-[10px] text-slate-500 font-bold font-mono tracking-wider mt-1.5">
                ID: {user?.employee?.employeeId || 'EMP-0004'}
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

      {/* MAIN CONTENT TILES: Calendar, Hours & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT MAIN AREA: Calendar & Chart (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Attendance Calendar */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Muster Log</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Attendance Calendar — {monthName} {year}</h3>
              </div>
              
              <div className="flex flex-wrap gap-1.5 justify-end">
                {Object.entries(summary).map(([k, v]) => (
                  <span key={k} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/5 text-slate-400">
                    {k}: <b className="text-white font-mono">{v}</b>
                  </span>
                ))}
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2.5 mb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2.5">
              {/* Padding spacer elements */}
              {[...Array(paddingDaysCount)].map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square bg-transparent rounded-xl" />
              ))}
              
              {/* Actual calendar days */}
              {calendarDays.map((dayObj) => (
                <div
                  key={dayObj.day}
                  className={`aspect-square rounded-xl p-1.5 border flex flex-col justify-between transition-all group relative cursor-pointer ${
                    statusColors[dayObj.status] || statusColors['pending']
                  }`}
                >
                  <span className="text-xs font-black font-mono">{dayObj.day}</span>
                  
                  {/* Status abbreviation or tiny dot indicator */}
                  <span className="text-[8px] font-bold uppercase truncate max-w-full text-center tracking-tighter opacity-80 scale-90 sm:scale-100">
                    {dayObj.status === 'weekly-off' ? 'OFF' : dayObj.status === 'present' ? 'OK' : dayObj.status === 'pending' ? '' : dayObj.status.replace('-','')}
                  </span>

                  {/* Hover tooltip for day details */}
                  {dayObj.label && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-noir border border-white/10 p-2 rounded-xl text-[10px] font-medium text-slate-200 shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center backdrop-blur-md">
                      <p className="font-bold text-white font-mono">{dayObj.dateStr}</p>
                      <p className="mt-0.5 text-crimson-400">{dayObj.label}</p>
                      <p className="text-slate-400 uppercase text-[9px] mt-0.5">Status: {dayObj.status}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-white/5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500/25 border border-green-500/40" /> Present</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/25 border border-yellow-500/40" /> Late</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/25 border border-amber-500/40" /> Half Day</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/25 border border-red-500/40" /> Absent</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/25 border border-blue-500/40" /> Leave</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500/25 border border-purple-500/40" /> Holiday</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white/10" /> Weekly Off</div>
            </div>

          </div>

          {/* Work Hours Trend */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Metrics</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Work Hours Trend</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">Last 6 Active Days</span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finalChartData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C50337" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C50337" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff20" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff20" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#02060E', borderColor: '#ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#C50337" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR AREA: Leaves, Holidays & Pay (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Leave Balances */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance</p>
                <h3 className="text-lg font-bold text-white mt-0.5">My Leave Balances</h3>
              </div>
            </div>

            <div className="space-y-4">
              {balances.length > 0 ? (
                balances.map((leave) => {
                  const used = leave.used || 0;
                  const total = leave.allocated || 12;
                  const remaining = total - used;
                  const color = leaveColors[leave.leaveType?.name] || 'bg-crimson-600';
                  
                  return (
                    <div key={leave._id} className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-300">{leave.leaveType?.name}</span>
                        <span className="text-sm font-bold text-white">
                          {remaining} <span className="text-[10px] text-slate-500 font-normal">left</span>
                        </span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-noir rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${(remaining / total) * 100}%` }} />
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-2 font-mono">
                        <span>Used: {used}</span>
                        <span>Total: {total}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">No leave balances found.</div>
              )}
            </div>
          </div>

          {/* Upcoming Holidays */}
          <div className="glass-card p-6 bg-noir-900/40">
            <div className="mb-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Holidays</p>
              <h3 className="text-lg font-bold text-white mt-0.5">Upcoming Holidays</h3>
            </div>

            <div className="space-y-4">
              {upcomingHolidays.length > 0 ? (
                upcomingHolidays.map((hol) => {
                  const hDate = new Date(hol.date);
                  const monStr = hDate.toLocaleString('default', { month: 'short' });
                  const dayStr = String(hDate.getDate()).padStart(2, '0');
                  
                  return (
                    <div key={hol._id} className="flex gap-4 items-center p-2 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors">
                      <div className="w-11 h-11 rounded-xl bg-crimson-600/10 border border-crimson-500/25 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] text-crimson-400 font-bold uppercase font-mono">{monStr}</span>
                        <span className="text-base text-white font-black leading-none font-mono">{dayStr}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs leading-snug">{hol.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {hDate.toLocaleDateString('en-US', { weekday: 'long' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">No upcoming holidays scheduled.</div>
              )}
            </div>
          </div>


        </div>

      </div>

    </div>
  );
}
