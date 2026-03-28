const ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(
    String.fromCharCode(...new Uint8Array(derivedBits)),
  );

  return `${ITERATIONS}:${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [iterationsStr, saltBase64, hashBase64] = storedHash.split(":");
  const iterations = Number(iterationsStr);
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(hashBase64), (c) =>
    c.charCodeAt(0),
  );

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    expectedHash.length * 8,
  );

  const derivedArray = new Uint8Array(derivedBits);

  // Constant-time comparison
  if (derivedArray.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedArray.length; i++) {
    diff |= derivedArray[i] ^ expectedHash[i];
  }
  return diff === 0;
}
