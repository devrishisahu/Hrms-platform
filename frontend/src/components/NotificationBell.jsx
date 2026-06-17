import { useEffect, useState } from 'react';
import * as ep from '../api/endpoints';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const { data } = await ep.myNotifications();
      setItems(data.data.items);
      setUnread(data.data.unreadCount);
    } catch { /* topbar widget — fail quietly */ }
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const openPanel = async () => {
    setOpen(!open);
    if (!open && unread > 0) { await ep.markAllRead(); setUnread(0); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn ghost sm" onClick={openPanel}>
        Notifications{unread > 0 && <span className="badge accent" style={{ marginLeft: 6 }}>{unread}</span>}
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, top: 40, width: 340, maxHeight: 380, overflowY: 'auto', zIndex: 20 }}>
          {items.length === 0 && <div className="empty">No notifications yet</div>}
          {items.map((n) => (
            <div key={n._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <b style={{ fontSize: 13.5 }}>{n.title}</b>
              <div className="muted" style={{ fontSize: 13 }}>{n.message}</div>
              <div className="mono muted" style={{ fontSize: 11 }}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
