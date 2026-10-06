import { createHash, randomBytes, scrypt, timingSafeEqual, type BinaryLike } from "node:crypto";

const scryptAsync = (password: BinaryLike, salt: BinaryLike, keylen: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))));

/** scrypt with a per-password random salt, stored as `scrypt$<salt>$<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Session tokens are random; only their SHA-256 is stored, so a leaked data file can't be replayed. */
export function newSessionToken(): { token: string; tokenHash: string } {
  const token = `tms_${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
