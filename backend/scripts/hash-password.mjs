import { randomBytes, pbkdf2Sync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 14) {
  console.error("Usage: node scripts/hash-password.mjs '<password of at least 14 characters>'");
  process.exit(1);
}
const salt = randomBytes(16);
const iterations = 210000;
const digest = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const b64url = value => value.toString("base64url");
console.log(b64url(salt) + "$" + iterations + "$" + b64url(digest));
