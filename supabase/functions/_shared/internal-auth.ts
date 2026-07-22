/**
 * Internal-only authorization for Edge Functions that must not be called from the browser.
 */
export function readInternalSecretEnv(name: string): string {
  return Deno.env.get(name) || "";
}

export function hasValidInternalSecret(
  req: Request,
  envName: string,
  headerName = "X-Early-Access-Internal-Secret",
): boolean {
  const expected = readInternalSecretEnv(envName);
  if (!expected) {
    console.error(`[internal-auth] Missing secret env: ${envName}`);
    return false;
  }

  const provided = req.headers.get(headerName) || "";
  if (!provided || provided.length !== expected.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export function unauthorizedResponse(
  jsonResponse: (body: unknown, status?: number) => Response,
): Response {
  return jsonResponse({ error: "Unauthorized." }, 401);
}
