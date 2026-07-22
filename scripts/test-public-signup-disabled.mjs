/**
 * Verify public signup is disabled while auth helpers remain available.
 * Run: node scripts/test-public-signup-disabled.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadAuthApi() {
  const src = fs.readFileSync(path.join(ROOT, "js/auth.js"), "utf8");
  const context = {
    window: {},
    document: {
      getElementById: () => null,
      querySelector: () => null,
      createElement: () => ({ textContent: "", innerHTML: "" }),
      addEventListener: () => {}
    },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console,
    Date,
    Math,
    Object,
    Array,
    String,
    Promise,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    history: { replaceState: () => {} }
  };
  context.window.location = {
    href: "http://localhost/signup.html",
    origin: "http://localhost",
    pathname: "/signup.html",
    search: "",
    hash: ""
  };
  vm.createContext(context);
  vm.runInContext(src, context);
  return context.window.HFAuth;
}

function readFileContains(relativePath, pattern) {
  const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  return pattern.test(text);
}

async function main() {
  const auth = loadAuthApi();
  let failed = false;

  if (auth.PUBLIC_SIGNUP_ENABLED !== false) {
    console.error("FAIL: PUBLIC_SIGNUP_ENABLED should be false");
    failed = true;
  }

  if (auth.isPublicSignupEnabled()) {
    console.error("FAIL: isPublicSignupEnabled() should be false");
    failed = true;
  }

  const signupResult = await auth.signUp("new-user@example.com", "password123");
  if (!signupResult.error || !/invitation-only/i.test(signupResult.error.message)) {
    console.error("FAIL: signUp() should reject public registration");
    failed = true;
  }

  if (readFileContains("login.html", /signup\.html/)) {
    console.error("FAIL: login.html still links to signup.html");
    failed = true;
  }

  if (!readFileContains("login.html", /invitation only/i)) {
    console.error("FAIL: login.html missing invitation-only message");
    failed = true;
  }

  if (!readFileContains("signup.html", /signup-invitation-only/)) {
    console.error("FAIL: signup.html missing invitation-only panel");
    failed = true;
  }

  if (!readFileContains("js/auth.js", /function initForgotPasswordPage/)) {
    console.error("FAIL: forgot password init missing");
    failed = true;
  }

  if (!readFileContains("js/auth.js", /function detectPasswordRecovery/)) {
    console.error("FAIL: invitation/password recovery helper missing");
    failed = true;
  }

  if (failed) process.exit(1);
  console.log("PASS: public signup disabled; login, recovery and invitation helpers preserved");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
