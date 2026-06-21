import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function createPrivatePreviewToken() {
  return randomBytes(24).toString("base64url");
}

export function hashPrivatePreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPrivatePreviewTokenValid(token: string, hash: string | null) {
  if (!token || !hash) return false;

  const tokenHash = Buffer.from(hashPrivatePreviewToken(token), "hex");
  const storedHash = Buffer.from(hash, "hex");

  return (
    tokenHash.length === storedHash.length &&
    timingSafeEqual(tokenHash, storedHash)
  );
}
