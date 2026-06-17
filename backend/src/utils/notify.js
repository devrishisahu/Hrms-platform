const Notification = require('../models/Notification');
const sendEmail = require('./sendEmail');

/**
 * Creates an in-app notification and (optionally) sends an email.
 * PRD 6.7 — event-driven notifications across channels.
 */
const notify = async ({ tenantId, user, title, message, type = 'info', email }) => {
  try {
    await Notification.create({ tenantId, user, title, message, type });
    if (email) {
      sendEmail({
        to: email,
        subject: `HRMS: ${title}`,
        html: `<div style="font-family:sans-serif"><h3>${title}</h3><p>${message}</p></div>`,
      });
    }
  } catch (err) {
    console.error('Notify error:', err.message);
  }
};

module.exports = notify;
