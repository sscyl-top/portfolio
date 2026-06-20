export const defaultAdminEmail = "3624457672@qq.com";

export function isAdminEmail(
  email: string | null | undefined,
  configuredEmail = process.env.ADMIN_EMAIL ?? defaultAdminEmail,
) {
  return email?.trim().toLowerCase() === configuredEmail.trim().toLowerCase();
}
