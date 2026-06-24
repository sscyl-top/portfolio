export const defaultAdminEmail = "hello@sscyl.top";

export function isAdminEmail(
  email: string | null | undefined,
  configuredEmail = process.env.ADMIN_EMAIL ?? defaultAdminEmail,
) {
  return email?.trim().toLowerCase() === configuredEmail.trim().toLowerCase();
}
