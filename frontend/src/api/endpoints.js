import api from './client';

// ---- Auth ----
export const login = (body) => api.post('/auth/login', body);
export const registerTenant = (body) => api.post('/auth/register-tenant', body);
export const logout = () => api.post('/auth/logout');
export const me = () => api.get('/auth/me');
export const changePassword = (body) => api.patch('/auth/change-password', body);

// ---- Dashboard ----
export const getDashboard = () => api.get('/dashboard');

// ---- Employees ----
export const listEmployees = (params) => api.get('/employees', { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (body) => api.post('/employees', body);
export const updateEmployee = (id, body) => api.patch(`/employees/${id}`, body);
export const exitEmployee = (id, body) => api.post(`/employees/${id}/exit`, body);
export const getOrgChart = () => api.get('/employees/org-chart');
export const myTeam = () => api.get('/employees/my-team');
export const uploadPhoto = (id, file) => {
  const fd = new FormData(); fd.append('photo', file);
  return api.post(`/employees/${id}/photo`, fd);
};
export const uploadDocument = (id, file, name, type) => {
  const fd = new FormData(); fd.append('document', file);
  if (name) fd.append('name', name);
  if (type) fd.append('type', type);
  return api.post(`/employees/${id}/documents`, fd);
};

// ---- Org ----
export const orgList = (entity) => api.get(`/org/${entity}`);
export const orgCreate = (entity, body) => api.post(`/org/${entity}`, body);
export const orgUpdate = (entity, id, body) => api.patch(`/org/${entity}/${id}`, body);
export const orgDelete = (entity, id) => api.delete(`/org/${entity}/${id}`);

// ---- Attendance ----
export const punch = (body) => api.post('/attendance/punch', body);
export const myAttendance = (month) => api.get('/attendance/my', { params: { month } });
export const teamAttendance = (date) => api.get('/attendance/team', { params: { date } });
export const allAttendance = (date) => api.get('/attendance/all', { params: { date } });
export const requestRegularization = (body) => api.post('/attendance/regularize', body);
export const listRegularizations = (status) => api.get('/attendance/regularizations', { params: { status } });
export const actRegularization = (id, body) => api.patch(`/attendance/regularizations/${id}`, body);

// ---- Leave ----
export const leaveTypes = () => api.get('/leave/types');
export const createLeaveType = (body) => api.post('/leave/types', body);
export const myBalances = () => api.get('/leave/balances/my');
export const applyLeave = (body) => api.post('/leave/apply', body);
export const myLeaves = () => api.get('/leave/my');
export const leaveRequests = (status) => api.get('/leave/requests', { params: { status } });
export const actLeave = (id, body) => api.patch(`/leave/requests/${id}`, body);
export const cancelLeave = (id) => api.patch(`/leave/requests/${id}/cancel`);

// ---- Approvals / Notifications ----
export const pendingApprovals = () => api.get('/approvals/pending');
export const myNotifications = () => api.get('/notifications');
export const markAllRead = () => api.patch('/notifications/read-all');

// ---- Reports ----
export const reportHeadcount = () => api.get('/reports/headcount');
export const reportAttendance = (month) => api.get('/reports/attendance-summary', { params: { month } });
export const reportLeaveUsage = (year) => api.get('/reports/leave-usage', { params: { year } });
export const reportLOP = (month) => api.get('/reports/lop', { params: { month } });
export const auditLogs = (page) => api.get('/reports/audit-logs', { params: { page } });

/** Downloads a CSV report through the authenticated client. */
export const downloadCSV = async (path, params, filename) => {
  const res = await api.get(path, { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
