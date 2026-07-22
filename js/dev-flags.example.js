/**
 * TEMPORARY DEVELOPMENT / QA ONLY — copy to js/dev-flags.js (gitignored).
 * BEFORE PUBLIC LAUNCH: delete dev-flags.js or set PASSWORD_RESET_DEV_RELAXED=false
 * and remove PASSWORD_RESET_DEV_RELAXED / PASSWORD_RESET_DEV_KEY Edge Function secrets.
 */
(function (global) {
  "use strict";

  global.HF_DEV_FLAGS = {
    /** When true, sends X-HF-DEV-RESET-KEY so the Edge Function can skip Auth email sends. */
    PASSWORD_RESET_DEV_RELAXED: false,
    /** Must match the PASSWORD_RESET_DEV_KEY secret on request-password-reset. */
    PASSWORD_RESET_DEV_KEY: ""
  };
})(window);
