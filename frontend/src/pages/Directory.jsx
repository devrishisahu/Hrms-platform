import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, UserPlus, SlidersHorizontal, ChevronRight, Briefcase, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import * as ep from '../api/endpoints';
import Badge from '../components/Badge.jsx';

export default function Directory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const load = async (page = 1) => {
    setIsLoading(true);
    try {
      const { data } = await ep.listEmployees({ search: search || undefined, department: department || undefined, page });
      setResult(data.data || { items: [], total: 0, page: 1, pages: 1 });
    } catch (err) {
      console.error('Failed to list employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    ep.orgList('departments')
      .then(({ data }) => setDepartments(data.data || []))
      .catch(err => console.error('Failed to load departments:', err));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [search, department]);

  return (
    <div className="p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-crimson-500" /> Employee Directory
            </h1>
            <p className="text-slate-400 mt-2">Browse, search, and filter employee profiles across the company</p>
          </div>
          
          {user?.role === 'hr' && (
            <Link 
              to="/dashboard/employees/new" 
              className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 flex items-center gap-2 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </Link>
          )}
        </div>

        {/* Filters Bar */}
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center bg-noir-900/40">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search name, employee ID, email..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-noir-800 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 transition-colors"
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-4 items-center shrink-0">
            <SlidersHorizontal className="w-5 h-5 text-slate-500 hidden md:block" />
            <select 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full md:w-64 bg-noir-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-crimson-500 transition-colors cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id} className="bg-noir">
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table/Directory view */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-noir-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Designation</th>
                  <th className="py-4 px-6">Manager</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {result.items.map((e) => (
                  <tr 
                    key={e._id} 
                    onClick={() => navigate(`/dashboard/employees/${e._id}`)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {e.photo?.url ? (
                          <img src={e.photo.url} alt="" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-crimson-500/10 border border-crimson-500/30 text-crimson-400 font-bold flex items-center justify-center text-sm uppercase">
                            {e.firstName[0]}{e.lastName?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-white group-hover:text-crimson-400 transition-colors">
                            {e.firstName} {e.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-300 font-mono">{e.employeeId}</td>
                    <td className="py-4 px-6 text-sm text-slate-300">{e.department?.name || '—'}</td>
                    <td className="py-4 px-6 text-sm text-slate-300">{e.designation?.title || '—'}</td>
                    <td className="py-4 px-6 text-sm text-slate-400">
                      {e.reportingManager ? `${e.reportingManager.firstName} ${e.reportingManager.lastName || ''}` : '—'}
                    </td>
                    <td className="py-4 px-6">
                      <Badge value={e.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="py-12 px-6 text-center text-slate-500">
                      No employees matched your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {result.pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <button 
              disabled={result.page <= 1} 
              onClick={() => load(result.page - 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:border-crimson-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-all hover:bg-crimson-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 font-mono">
              Page {result.page} of {result.pages}
            </span>
            <button 
              disabled={result.page >= result.pages} 
              onClick={() => load(result.page + 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:border-crimson-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-all hover:bg-crimson-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
