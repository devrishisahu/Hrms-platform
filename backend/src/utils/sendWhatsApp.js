/**
 * sendWhatsApp — sends a WhatsApp message using Twilio's API.
 * Scoped and fire-and-forget, so it never blocks primary flows.
 */
const sendWhatsApp = async ({ to, body }) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || '+14155238886'; // Default Twilio Sandbox number

    if (!accountSid || !authToken) {
      console.log(`[WhatsApp skipped — Twilio not configured] to=${to} body="${body.replace(/\n/g, ' ')}"`);
      return null;
    }

    // Standardize phone number format for WhatsApp (should start with whatsapp:)
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', formattedFrom);
    params.append('To', formattedTo);
    params.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio WhatsApp API error:', data.message || response.statusText);
      return null;
    }

    console.log(`✅ WhatsApp sent successfully to ${to}, SID: ${data.sid}`);
    return data;
  } catch (err) {
    console.error('WhatsApp service error:', err.message);
    return null;
  }
};

module.exports = sendWhatsApp;
