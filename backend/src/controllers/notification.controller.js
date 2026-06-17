const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.myNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const filter = { tenantId: req.tenantId, user: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ tenantId: req.tenantId, user: req.user._id, isRead: false }),
  ]);
  res.json({ success: true, data: { items, unreadCount } });
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, tenantId: req.tenantId, user: req.user._id },
    { isRead: true }
  );
  res.json({ success: true, message: 'Marked as read' });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { tenantId: req.tenantId, user: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
});
