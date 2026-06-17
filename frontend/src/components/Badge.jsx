const TONE = {
  present: 'ok', approved: 'ok', active: 'ok', success: 'ok',
  late: 'warn', 'half-day': 'warn', pending: 'warn', probation: 'warn', onboarding: 'warn',
  absent: 'danger', rejected: 'danger', exited: 'danger', 'notice-period': 'danger',
  'on-leave': 'info', holiday: 'info', 'weekly-off': 'neutral', cancelled: 'neutral',
};

export default function Badge({ value }) {
  if (!value) return null;
  return <span className={`badge ${TONE[value] || 'neutral'}`}>{value}</span>;
}
