import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', roles: ['employee', 'manager', 'hr', 'leadership'] },
  { to: '/directory', label: 'Directory', roles: ['employee', 'manager', 'hr', 'leadership'] },
  { to: '/attendance', label: 'Attendance', roles: ['employee', 'manager', 'hr', 'leadership'] },
  { to: '/leave', label: 'Leave', roles: ['employee', 'manager', 'hr', 'leadership'] },
  { to: '/approvals', label: 'Approvals', roles: ['manager', 'hr'] },
  { to: '/org-chart', label: 'Org chart', roles: ['employee', 'manager', 'hr', 'leadership'] },
  { to: '/reports', label: 'Reports', roles: ['hr', 'leadership'] },
  { to: '/org', label: 'Organization', roles: ['hr'] },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const emp = user?.employee;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          HRVerse<em>.</em>
          <small>people ops platform</small>
        </div>
        <nav className="nav">
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="whoami">
          <b>{emp ? `${emp.firstName} ${emp.lastName || ''}` : user.email}</b>
          <span className="mono">{emp?.employeeId} · {user.role}</span>
          <button onClick={async () => { await signOut(); navigate('/login'); }}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <span className="crumb">{new Date().toDateString()}</span>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
