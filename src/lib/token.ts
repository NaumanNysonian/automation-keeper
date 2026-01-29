import crypto from "crypto";

const secret = process.env.GOOGLE_TOKEN_SECRET;

function getKey() {
  if (!secret) throw new Error("Missing GOOGLE_TOKEN_SECRET");
  const buf = Buffer.from(secret.padEnd(32, "0").slice(0, 32));
  return buf;
}

export async function encryptToken(payload: object) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString("base64");
}

export async function decryptToken(serialized: string) {
  try {
    const raw = Buffer.from(serialized, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const result = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(result.toString("utf8"));
  } catch (err) {
    console.error("Failed to decrypt token", err);
    return null;
  }
}
