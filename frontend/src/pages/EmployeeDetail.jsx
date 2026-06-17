import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Clock, FileText, Upload, CheckCircle2, ShieldAlert, ArrowLeft, Edit2, Archive, Camera, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import * as ep from '../api/endpoints';
import { errMsg } from '../api/client';
import Badge from '../components/Badge.jsx';

const DetailRow = ({ icon: Icon, k, v, mono }) => (
  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
    <td className="py-3.5 px-6 text-slate-400 text-sm font-medium flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-slate-500" />}
      <span>{k}</span>
    </td>
    <td className={`py-3.5 px-6 text-sm ${mono ? 'font-mono text-slate-300' : 'text-slate-200'}`}>
      {v || '—'}
    </td>
  </tr>
);

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({});
  const photoRef = useRef();
  const docRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  // Password change states
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');
  const [passBusy, setPassBusy] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassSuccess('');
    setPassError('');

    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    if (passForm.newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long');
      return;
    }

    setPassBusy(true);
    try {
      await ep.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      setPassSuccess('Password updated successfully!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassError(errMsg(err));
    } finally {
      setPassBusy(false);
    }
  };


  const isSelf = user?.employee && String(user.employee._id || user.employee) === String(id);
  const isHR = user?.role === 'hr';

  const load = async () => {
    try {
      const { data } = await ep.getEmployee(id);
      setEmp(data.data.employee);
    } catch (e) { 
      setError(errMsg(e)); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If standard employee and trying to view another employee's detail, redirect to their own profile
    if (user?.role === 'employee') {
      const myEmployeeId = user.employee?._id || user.employee;
      if (myEmployeeId && String(myEmployeeId) !== String(id)) {
        navigate(`/dashboard/employees/${myEmployeeId}`, { replace: true });
        return;
      }
    }
    load();
  }, [id, user, navigate]);

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-crimson-500/10 border border-crimson-500/30 rounded-2xl text-crimson-400 text-sm flex gap-3 items-center max-w-4xl mx-auto">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (isLoading || !emp) {
    return (
      <div className="flex justify-center items-center py-20 min-h-screen">
        <div className="w-10 h-10 border-3 border-crimson-500/30 border-top-color-[#C50337] rounded-full animate-spin" />
      </div>
    );
  }

  const startEdit = () => {
    setEdit({ 
      phone: emp.phone || '', 
      personalEmail: emp.personalEmail || '', 
      currentAddress: emp.currentAddress || '', 
      permanentAddress: emp.permanentAddress || '' 
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      await ep.updateEmployee(id, edit);
      setEditing(false);
      await load();
    } catch (e) { 
      setError(errMsg(e)); 
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { 
      await ep.uploadPhoto(id, file); 
      await load(); 
    } catch (err) { 
      setError(errMsg(err)); 
    }
  };

  const onDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { 
      await ep.uploadDocument(id, file, file.name); 
      await load(); 
    } catch (err) { 
      setError(errMsg(err)); 
    }
  };

  const offboard = async () => {
    const exitReason = window.prompt('Exit reason (the record will be archived, not deleted):');
    if (exitReason === null) return;
    try { 
      await ep.exitEmployee(id, { exitReason }); 
      await load(); 
    } catch (e) { 
      setError(errMsg(e)); 
    }
  };

  return (
    <div className="p-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Back Link */}
        <Link to="/dashboard/directory" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>

        {/* Profile Card Header */}
        <div className="glass-card p-6 bg-gradient-to-br from-crimson-950/10 to-noir-900 border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-crimson-500/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="relative group cursor-pointer" onClick={() => (isSelf || isHR) && photoRef.current.click()}>
              {emp.photo?.url ? (
                <img src={emp.photo.url} alt="" className="w-24 h-24 rounded-2xl border border-white/10 object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-crimson-500/10 border border-crimson-500/30 text-crimson-400 font-extrabold flex items-center justify-center text-3xl uppercase">
                  {emp.firstName[0]}{emp.lastName?.[0] || ''}
                </div>
              )}
              {(isSelf || isHR) && (
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-extrabold text-white flex items-center justify-center sm:justify-start gap-3">
                {emp.firstName} {emp.lastName}
              </h1>
              <p className="text-slate-400 mt-1.5 flex flex-wrap justify-center sm:justify-start items-center gap-2 text-sm">
                <span className="font-mono text-slate-300">{emp.employeeId}</span>
                <span className="text-slate-600">•</span>
                <span>{emp.designation?.title || 'No Designation'}</span>
                <span className="text-slate-600">•</span>
                <span>{emp.department?.name || 'No Department'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-3 shrink-0 relative z-10">
            <Badge value={emp.status} />
            {(isSelf || isHR) && (
              <button 
                onClick={() => photoRef.current.click()}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </button>
            )}
            {isHR && emp.status !== 'exited' && (
              <button 
                onClick={offboard}
                className="px-4 py-2 bg-crimson-600/10 hover:bg-crimson-600 hover:text-white border border-crimson-600/20 hover:border-transparent text-crimson-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" /> Offboard
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          </div>
        </div>

        {/* Profile Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Contact details */}
          <div className="glass-card p-6 bg-noir-900/40 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-crimson-400" /> Contact Info
              </h3>
              {(isSelf || isHR) && !editing && (
                <button 
                  onClick={startEdit}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {!editing ? (
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <DetailRow icon={Mail} k="Official Email" v={emp.officialEmail} mono />
                    <DetailRow icon={Mail} k="Personal Email" v={emp.personalEmail} mono />
                    <DetailRow icon={Phone} k="Phone" v={emp.phone} mono />
                    <DetailRow icon={MapPin} k="Current Address" v={emp.currentAddress} />
                    <DetailRow icon={MapPin} k="Permanent Address" v={emp.permanentAddress} />
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input type="text" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                    className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Email</label>
                  <input type="email" value={edit.personalEmail} onChange={(e) => setEdit({ ...edit, personalEmail: e.target.value })}
                    className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Address</label>
                  <input type="text" value={edit.currentAddress} onChange={(e) => setEdit({ ...edit, currentAddress: e.target.value })}
                    className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permanent Address</label>
                  <input type="text" value={edit.permanentAddress} onChange={(e) => setEdit({ ...edit, permanentAddress: e.target.value })}
                    className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} className="px-4 py-2 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-xs font-bold transition-all">
                    Save Changes
                  </button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Employment details */}
          <div className="glass-card p-6 bg-noir-900/40 space-y-6">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-crimson-400" /> Employment details
            </h3>

            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <DetailRow icon={Calendar} k="Date of Joining" v={emp.dateOfJoining && new Date(emp.dateOfJoining).toLocaleDateString()} mono />
                  <DetailRow icon={Briefcase} k="Employment Type" v={emp.employmentType} />
                  <DetailRow icon={MapPin} k="Office Location" v={emp.location} />
                  <DetailRow icon={User} k="Reporting Manager" v={emp.reportingManager ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName || ''}` : null} />
                  <DetailRow icon={Clock} k="Shift" v={emp.shift ? `${emp.shift.name} (${emp.shift.startTime}–${emp.shift.endTime})` : null} mono />
                  {emp.status === 'exited' && (
                    <DetailRow icon={Calendar} k="Exit Date" v={emp.exitDate && new Date(emp.exitDate).toLocaleDateString()} mono />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        {(isSelf || isHR) && (
          <div className="glass-card p-6 bg-noir-900/40 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-crimson-400" /> Documents
              </h3>
              
              <button 
                onClick={() => docRef.current.click()}
                className="px-4 py-2 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-xs font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Document
              </button>
              <input ref={docRef} type="file" hidden onChange={onDoc} />
            </div>

            {(!emp.documents || emp.documents.length === 0) ? (
              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-slate-500 text-sm">
                No documents found. Upload contracts, identification proofs, or degrees.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-5">Name</th>
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3 px-5">Uploaded Date</th>
                      <th className="py-3 px-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {emp.documents.map((d) => (
                      <tr key={d._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-5 text-sm font-semibold text-white truncate max-w-[250px]">{d.name}</td>
                        <td className="py-3.5 px-5">
                          <Badge value={d.type} />
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-400 font-mono">
                          {new Date(d.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <a 
                            href={d.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-bold text-crimson-400 hover:text-crimson-350 transition-colors"
                          >
                            Open Link
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Security Settings / Change Password */}
        {isSelf && (
          <div className="glass-card p-6 bg-noir-900/40 space-y-6">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-crimson-400" /> Security Settings
            </h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              {passSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex gap-2 items-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{passSuccess}</span>
                </div>
              )}
              {passError && (
                <div className="p-3 bg-crimson-500/10 border border-crimson-500/30 rounded-xl text-crimson-400 text-sm flex gap-2 items-center">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{passError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Password</label>
                <input 
                  type="password" 
                  value={passForm.currentPassword} 
                  onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                  required
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" 
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Password</label>
                <input 
                  type="password" 
                  value={passForm.newPassword} 
                  onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                  required
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" 
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passForm.confirmPassword} 
                  onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                  required
                  className="w-full bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-crimson-500 transition-colors text-sm" 
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={passBusy}
                className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center animate-pulse-once"
              >
                {passBusy ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
