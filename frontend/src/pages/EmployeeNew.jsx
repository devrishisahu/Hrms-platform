import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, ArrowLeft, ShieldAlert, CheckCircle2, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import * as ep from '../api/endpoints';
import { errMsg } from '../api/client';

export default function EmployeeNew() {
  const navigate = useNavigate();
  const [opts, setOpts] = useState({ departments: [], designations: [], shifts: [], managers: [] });
  const [form, setForm] = useState({
    firstName: '', lastName: '', officialEmail: '', dateOfJoining: '',
    role: 'employee', employmentType: 'full-time',
    department: '', designation: '', shift: '', reportingManager: '', location: '', phone: '',
    tempPassword: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  
  // Success modal details
  const [successData, setSuccessData] = useState(null); // { employee, tempPassword, role }
  const [copied, setCopied] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    Promise.all([
      ep.orgList('departments'), 
      ep.orgList('designations'), 
      ep.orgList('shifts'), 
      ep.listEmployees({ limit: 100 })
    ])
    .then(([d, g, s, m]) => setOpts({
      departments: d.data.data || [], 
      designations: g.data.data || [], 
      shifts: s.data.data || [], 
      managers: (m.data.data.items || []).filter(emp => emp.status !== 'exited'),
    }))
    .catch(err => console.error('Failed to load form options:', err));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const { data } = await ep.createEmployee(body);
      setSuccessData({
        employee: data.data.employee,
        tempPassword: data.data.tempPassword,
        role: form.role
      });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!successData) return;
    navigator.clipboard.writeText(`Email: ${successData.employee.officialEmail}\nPassword: ${successData.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Back Link */}
        <Link to="/dashboard/directory" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>

        {/* Title */}
        <div className="text-left">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-crimson-500" /> Add New Employee
          </h1>
          <p className="text-slate-400 mt-2">Register a new profile in the organization and send them a setup invite</p>
        </div>

        {error && (
          <div className="p-4 bg-crimson-500/10 border border-crimson-500/30 rounded-2xl text-crimson-400 text-sm flex gap-3 items-center">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={submit} className="glass-card p-6 bg-noir-900/40 space-y-8 text-left">
          
          {/* Section: Basic Details */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-crimson-400 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">First Name *</label>
                <input 
                  type="text" 
                  required 
                  value={form.firstName} 
                  onChange={set('firstName')}
                  placeholder="John"
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-605 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Name</label>
                <input 
                  type="text" 
                  value={form.lastName} 
                  onChange={set('lastName')}
                  placeholder="Doe"
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-605 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Work Email *</label>
                <input 
                  type="email" 
                  required 
                  value={form.officialEmail} 
                  onChange={set('officialEmail')}
                  placeholder="john.doe@company.com"
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-605 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
                <input 
                  type="text" 
                  value={form.phone} 
                  onChange={set('phone')}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-605 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date of Joining *</label>
                <input 
                  type="date" 
                  required 
                  value={form.dateOfJoining} 
                  onChange={set('dateOfJoining')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</label>
                <input 
                  type="text" 
                  value={form.location} 
                  onChange={set('location')} 
                  placeholder="e.g. Bengaluru, IN"
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-605 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Employment Details */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-crimson-400 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Professional Settings
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Role</label>
                <select 
                  value={form.role} 
                  onChange={set('role')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                >
                  <option value="employee" className="bg-noir">Employee</option>
                  <option value="manager" className="bg-noir">Manager</option>
                  <option value="hr" className="bg-noir">HR / Admin</option>
                  <option value="leadership" className="bg-noir">Leadership</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employment Type</label>
                <select 
                  value={form.employmentType} 
                  onChange={set('employmentType')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                >
                  <option value="full-time" className="bg-noir">Full-time</option>
                  <option value="part-time" className="bg-noir">Part-time</option>
                  <option value="contract" className="bg-noir">Contract</option>
                  <option value="intern" className="bg-noir">Intern</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Work Shift</label>
                <select 
                  value={form.shift} 
                  onChange={set('shift')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                >
                  <option value="" className="bg-noir">Default Shift</option>
                  {opts.shifts.map((s) => (
                    <option key={s._id} value={s._id} className="bg-noir">
                      {s.name} ({s.startTime}–{s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</label>
                <select 
                  value={form.department} 
                  onChange={set('department')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                >
                  <option value="" className="bg-noir">—</option>
                  {opts.departments.map((d) => (
                    <option key={d._id} value={d._id} className="bg-noir">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Designation</label>
                <select 
                  value={form.designation} 
                  onChange={set('designation')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                >
                  <option value="" className="bg-noir">—</option>
                  {opts.designations.map((d) => (
                    <option key={d._id} value={d._id} className="bg-noir">
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reporting Manager</label>
                <select 
                  value={form.reportingManager} 
                  onChange={set('reportingManager')}
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm cursor-pointer"
                >
                  <option value="" className="bg-noir">—</option>
                  {opts.managers.map((m) => (
                    <option key={m._id} value={m._id} className="bg-noir">
                      {m.firstName} {m.lastName} ({m.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Temporary Password (Optional)</label>
                <input 
                  type="text" 
                  value={form.tempPassword} 
                  onChange={set('tempPassword')}
                  placeholder="Leave blank to let system auto-generate"
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-605 focus:outline-none focus:border-crimson-500 transition-colors text-sm"
                />
              </div>

            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-white/5 pt-6 flex justify-end gap-3">
            <Link 
              to="/dashboard/directory"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            
            <button 
              type="submit" 
              disabled={busy}
              className="px-6 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inviting...</span>
                </>
              ) : (
                'Create Profile & Send Invite'
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Success Details Modal */}
      <AnimatePresence>
        {successData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-noir-900 border border-crimson-500/25 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-crimson-500/10 rounded-full blur-[80px]" />
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Employee Profile Created!</h2>
                <p className="text-slate-400 text-sm mt-1">Workspace account credentials generated.</p>
              </div>

              {/* Login Credentials Card */}
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 mb-6">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Account Details</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-crimson-500/10 border border-crimson-500/20 text-crimson-405 capitalize">
                    {successData.role}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Full Name</label>
                    <p className="text-sm font-bold text-white">
                      {successData.employee.firstName} {successData.employee.lastName}
                    </p>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Login Email Address</label>
                    <p className="text-sm font-mono text-slate-200 font-bold select-all">
                      {successData.employee.officialEmail}
                    </p>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Temporary Password</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-green-400 font-bold tracking-wider select-all">
                        {successData.tempPassword}
                      </p>
                      <button 
                        onClick={handleCopy}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                          copied 
                            ? 'bg-green-600 text-white' 
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {copied ? 'Copied!' : 'Copy Info'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-[11px] text-yellow-500/80 leading-relaxed mb-6">
                <strong>Onboarding Notice:</strong> An email invite containing these details has been dispatched. You can copy the credentials above to share them with the user immediately.
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setSuccessData(null);
                    setForm({
                      firstName: '', lastName: '', officialEmail: '', dateOfJoining: '',
                      role: 'employee', employmentType: 'full-time',
                      department: '', designation: '', shift: '', reportingManager: '', location: '', phone: '',
                      tempPassword: '',
                    });
                  }}
                  className="flex-1 px-5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
                >
                  Create Another Profile
                </button>
                <button 
                  onClick={() => navigate(`/dashboard/employees/${successData.employee._id}`)}
                  className="flex-1 px-5 py-3 rounded-xl text-xs font-bold text-white bg-crimson-600 hover:bg-crimson-500 transition-all text-center shadow-lg shadow-crimson-600/15"
                >
                  View Full Profile
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
