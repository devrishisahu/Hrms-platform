const nodemailer = require('nodemailer');

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

/**
 * Fire-and-forget email. Never throws — email failure must not break API flows.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log(`[mail skipped — SMTP not configured] to=${to} subject="${subject}"`);
      return null;
    }
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to, subject, html, text,
    });
    return info;
  } catch (err) {
    console.error('Email error:', err.message);
    return null;
  }
};

module.exports = sendEmail;
