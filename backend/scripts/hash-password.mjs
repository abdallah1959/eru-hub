import { randomBytes, pbkdf2Sync } from "node:crypto";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
  console.error("Run this script in an interactive terminal so the password can be entered without echo.");
  process.exit(1);
}

stdout.write("Admin password (at least 14 characters; input hidden): ");
stdin.setRawMode(true);
stdin.resume();

let password = "";
let finished = false;

function finish() {
  if (finished) return;
  finished = true;
  stdin.setRawMode(false);
  stdin.pause();
  stdout.write("\n");

  if (password.length < 14) {
    password = "";
    console.error("Password must be at least 14 characters.");
    process.exitCode = 1;
    return;
  }

  const salt = randomBytes(16);
  // Cloudflare Workers WebCrypto supports at most 100,000 PBKDF2 iterations.
  const iterations = 100000;
  const digest = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  password = "";
  const b64url = value => value.toString("base64url");
  console.log("ADMIN_PASSWORD_HASH (copy directly into the Cloudflare Secret field):");
  console.log(b64url(salt) + "$" + iterations + "$" + b64url(digest));
}

stdin.on("data", chunk => {
  if (finished) return;
  for (const char of chunk.toString("utf8")) {
    if (char === "\u0003") {
      password = "";
      finished = true;
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\nCancelled.\n");
      process.exitCode = 1;
      return;
    }
    if (char === "\r" || char === "\n") {
      finish();
      return;
    }
    if (char === "\u007f" || char === "\b") {
      password = password.slice(0, -1);
    } else {
      password += char;
    }
  }
});
