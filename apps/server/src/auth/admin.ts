/** Default ShipLocal Cloud operators when ADMIN_EMAILS is unset. */
const DEFAULT_ADMIN_EMAILS = ['onifkay@gmail.com', 'admin@shiplocal.cloud'];

export function getAdminEmails(): Set<string> {
  const raw = process.env['ADMIN_EMAILS'];
  const list = raw
    ? raw
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;

  return new Set(list);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().has(email.trim().toLowerCase());
}
