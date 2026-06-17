import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TopNav({ user }) {
  const navigate = useNavigate();
  const displayName = user?.employee?.firstName 
    ? `${user.employee.firstName} ${user.employee.lastName}` 
    : user?.email?.split('@')[0] || 'User';
  
  const avatarUrl = user?.employee?.photo?.url 
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=C50337&color=fff`;

  return (
    <header className="h-20 border-b border-white/5 bg-noir/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-6 flex-1">
        <h2 className="text-xl font-bold text-white hidden md:block capitalize">
          {user?.role || 'My'} Workspace
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-crimson-500 rounded-full" />
        </button>
        
        <div 
          onClick={() => {
            const empId = user?.employee?._id || user?.employee;
            if (empId) navigate(`/dashboard/employees/${empId}`);
          }}
          className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white group-hover:text-crimson-300 transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-slate-400 capitalize">{user?.role || ''}</p>
          </div>
          <img 
            src={avatarUrl} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border border-white/10"
          />
        </div>
      </div>
    </header>
  );
}
