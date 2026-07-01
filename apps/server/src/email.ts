const RESEND_API_KEY = process.env['RESEND_API_KEY'];
const EMAIL_FROM = process.env['EMAIL_FROM'] ?? 'ShipLocal <noreply@shiplocal.cloud>';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = 'Reset your ShipLocal password';
  const html = `
    <p>You requested a password reset for your ShipLocal account.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    <p style="color:#666;font-size:12px">ShipLocal — share localhost with clients</p>
  `.trim();

  if (!RESEND_API_KEY) {
    console.log('[email] Password reset (no RESEND_API_KEY — dev mode)');
    console.log(`  To: ${to}`);
    console.log(`  Reset URL: ${resetUrl}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to send email: ${response.status} ${body}`);
  }
}
