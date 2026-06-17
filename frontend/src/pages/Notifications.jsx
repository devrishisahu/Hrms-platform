import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2, Clock, Info } from 'lucide-react';
import * as ep from '../api/endpoints';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await ep.myNotifications();
      setItems(data.data.items);
      setUnread(data.data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await ep.markAllRead();
      setUnread(0);
      // Mark local items as read
      setItems(items.map(item => ({ ...item, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-crimson-500" /> Notifications
            </h1>
            <p className="text-slate-400 mt-2">
              Stay updated with system alerts, leave requests, and operations
            </p>
          </div>
          
          {unread > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 flex items-center gap-2 self-start sm:self-auto"
            >
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-3 border-crimson-500/30 border-top-color-[#C50337] rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-10 text-center"
          >
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-slate-500">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">All caught up!</h3>
            <p className="text-slate-500">You don't have any new notifications at the moment.</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {items.map((item, index) => (
              <motion.div 
                key={item._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card p-5 relative overflow-hidden transition-all duration-300 ${
                  !item.isRead 
                    ? 'border-l-4 border-l-crimson-500 bg-gradient-to-r from-crimson-950/20 to-noir border-white/5' 
                    : 'border-white/5'
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/5
                    ${!item.isRead ? 'bg-crimson-500/10 text-crimson-400' : 'bg-slate-800/40 text-slate-400'}`}
                  >
                    <Info className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
