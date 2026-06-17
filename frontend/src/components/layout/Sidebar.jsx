import { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, CheckSquare, Bell, FileText, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await signOut();
      navigate('/login');
    }
  };

  const isManagerOrAdmin = ['hr', 'manager', 'leadership'].includes(user?.role);
  const isHrOrLeader = ['hr', 'leadership'].includes(user?.role);
  console.log('Sidebar user:', user);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
    ...(isManagerOrAdmin ? [{ icon: Users, label: 'Directory', to: '/dashboard/directory' }] : []),
    { icon: Clock, label: 'Attendance', to: '/dashboard/attendance' },
    { icon: Calendar, label: 'Leave', to: '/dashboard/leave' },
    ...(isManagerOrAdmin ? [{ icon: CheckSquare, label: 'Approvals', to: '/dashboard/approvals' }] : []),
    { icon: Bell, label: 'Notifications', to: '/dashboard/notifications' },
    ...(isHrOrLeader ? [{ icon: FileText, label: 'Reports', to: '/dashboard/reports' }] : []),
    ...(isHrOrLeader ? [{ icon: Settings, label: 'Settings', to: '/dashboard/settings' }] : []),
    ...(user?.employee?._id ? [{ icon: User, label: 'Profile', to: `/dashboard/employees/${user.employee._id}` }] : []),
  ];


  return (
    <motion.aside 
      animate={{ width: isExpanded ? 240 : 80 }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="h-full bg-glass-gradient backdrop-blur-xl border-r border-white/5 flex flex-col py-6 relative z-40"
    >
      <div className="flex items-center px-6 mb-8 gap-3 overflow-hidden whitespace-nowrap">
        <div className="w-8 h-8 min-w-[32px] rounded bg-crimson-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-crimson-500/20">
          H
        </div>
        <motion.span 
          animate={{ opacity: isExpanded ? 1 : 0 }} 
          className="text-xl font-bold text-white tracking-wide"
        >
          HRVerse
        </motion.span>
      </div>

      <nav className="flex-1 flex flex-col gap-2 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => `
              flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="active-nav" 
                    className="absolute inset-0 bg-crimson-500/10 border border-crimson-500/30 rounded-xl" 
                  />
                )}
                <div className="relative z-10 flex items-center justify-center min-w-[24px]">
                  <item.icon className={`w-6 h-6 ${isActive ? 'text-crimson-400' : ''}`} />
                </div>
                <motion.span 
                  animate={{ opacity: isExpanded ? 1 : 0, x: isExpanded ? 0 : -10 }}
                  className="relative z-10 font-medium whitespace-nowrap text-sm"
                >
                  {item.label}
                </motion.span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-3 mt-auto border-t border-white/5 pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-slate-400 hover:text-crimson-400 hover:bg-crimson-500/5 transition-all duration-300 relative group overflow-hidden"
        >
          <div className="flex items-center justify-center min-w-[24px]">
            <LogOut className="w-6 h-6" />
          </div>
          <motion.span 
            animate={{ opacity: isExpanded ? 1 : 0, x: isExpanded ? 0 : -10 }}
            className="font-medium whitespace-nowrap text-sm"
          >
            Log Out
          </motion.span>
        </button>
      </div>
    </motion.aside>
  );
}
