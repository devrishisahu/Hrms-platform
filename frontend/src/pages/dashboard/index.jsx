import { useSelector } from 'react-redux';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
import HrDashboard from './HrDashboard';
import LeadershipDashboard from './LeadershipDashboard';

export default function DashboardIndex() {
  const user = useSelector((state) => state.auth?.user);

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        Loading dashboard...
      </div>
    );
  }

  switch (user.role) {
    case 'employee':
      return <EmployeeDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'hr':
      return <HrDashboard />;
    case 'leadership':
      return <LeadershipDashboard />;
    default:
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
          Unknown role: {user.role}
        </div>
      );
  }
}
