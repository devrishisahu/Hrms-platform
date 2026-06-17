import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function DashboardLayout() {
  const user = useSelector((state) => state.auth?.user);

  return (
    <div className="flex h-screen overflow-hidden bg-noir text-slate-200">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav user={user} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
