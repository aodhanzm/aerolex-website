// Sets (or clears) the password for the website's private pages.
//
// Run from the website folder:   node _tools/set-private-password.mjs
// To remove the password (locks the private pages for everyone):   node _tools/set-private-password.mjs --clear
//
// What it does: asks for the password twice without showing it on screen, turns it into a slow
// scrambled "fingerprint", and writes only that fingerprint into assets/private-gate.js.
// The password itself is never saved, printed or sent anywhere.
// This folder starts with an underscore, so the website never serves this file to visitors.

import { readFileSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

// The password-screen file whose settings line this script rewrites.
const gateFile = fileURLToPath(new URL("../assets/private-gate.js", import.meta.url));
// Same number of scrambling rounds the password screen uses; the two must match.
const ITERATIONS = 250000;
// Finds the one settings line, e.g.  var GATE = { salt: '...', hash: '...', iterations: 250000 };
const GATE_LINE = /var GATE = \{[^}]*\};/;

// Write new settings into the password-screen file, refusing if the settings line can't be found.
function writeGate(salt, hash) {
  const source = readFileSync(gateFile, "utf8");
  if (!GATE_LINE.test(source)) throw new Error("Couldn't find the GATE settings line in assets/private-gate.js.");
  const line = `var GATE = { salt: '${salt}', hash: '${hash}', iterations: ${ITERATIONS} };`;
  writeFileSync(gateFile, source.replace(GATE_LINE, line));
}

// Ask a question in the terminal without echoing what's typed (shows nothing, like most password prompts).
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const input = process.stdin;
    // Not a real terminal (for example, input piped in for a test): just read one line as-is.
    if (!input.isTTY) {
      let data = "";
      input.setEncoding("utf8");
      input.on("data", (chunk) => (data += chunk));
      input.on("end", () => { process.stdout.write("\n"); resolve(data.split(/\r?\n/)[0]); });
      return;
    }
    // Real terminal: read key by key so nothing appears on screen.
    let typed = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const onKey = (key) => {
      if (key === "\r" || key === "\n") {          // Enter: finished typing
        input.setRawMode(false);
        input.pause();
        input.removeListener("data", onKey);
        process.stdout.write("\n");
        resolve(typed);
      } else if (key === "\u0003") {               // Ctrl+C: give up without changing anything
        process.stdout.write("\nCancelled. Nothing changed.\n");
        process.exit(1);
      } else if (key === "\u007f" || key === "\b") { // Backspace: remove the last character
        typed = typed.slice(0, -1);
      } else {
        typed += key;                               // Any other key: add it to the password
      }
    };
    input.on("data", onKey);
  });
}

// --clear: blank the settings so no password works and the private pages stay locked.
if (process.argv.includes("--clear")) {
  writeGate("", "");
  console.log("Password removed. The private pages now stay locked for everyone.");
  process.exit(0);
}

const first = await askHidden("New password for the private pages: ");
// Short passwords are easy to guess from the public fingerprint, so insist on a long one.
if (first.length < 12) {
  console.log("Please use at least 12 characters (a few random words works well). Nothing changed.");
  process.exit(1);
}
// Ask twice in a real terminal to catch typos you can't see; a piped test only supplies it once.
if (process.stdin.isTTY) {
  const second = await askHidden("Type it again to confirm: ");
  if (first !== second) {
    console.log("The two didn't match. Nothing changed.");
    process.exit(1);
  }
}

// Fresh random salt each time, so the same password never produces the same fingerprint twice.
const salt = randomBytes(16).toString("hex");
// The slow fingerprint: same recipe as the password screen in the browser (PBKDF2, SHA-256, 32 bytes).
const hash = pbkdf2Sync(first, salt, ITERATIONS, 32, "sha256").toString("hex");
writeGate(salt, hash);
console.log("Password set. Only its fingerprint was saved in assets/private-gate.js.");
console.log("Browsers unlocked with an older password will be asked again.");
