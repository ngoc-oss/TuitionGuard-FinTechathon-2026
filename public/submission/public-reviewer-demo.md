# Public reviewer demo — October 2026 update

## Two distinct environments
- `/`: anonymous, browser-only deterministic simulation with English, Vietnamese and Simplified Chinese. No identity, bank or LLM service is called. Separate simulated wallets are available for VND, CNY and USD. Six cross-currency directions are supported.
- `/lab`: retained authenticated server/D1 sandbox and optional Groq integration. Its existing transfer engine supports VND to CNY only. Private account APIs continue to require identity. Public demo balances are not synchronized with server balances.

The public demo prioritizes account-free review and offline portability. It does not replace the server policy boundary or claim production security. Browser data, approval snapshots and exported evidence can be modified by the visitor. These are teaching artifacts, not bank receipts or cryptographic attestations.

## FX semantics
Reference fixture: 1 CNY = 3,600 VND; 1 USD = 25,000 VND. These are authored constants, not current market quotes. Provider A adds 0.2% spread, B 0.1%, C 0.5%. Fixed VND-equivalent fees are converted into the source currency and rounded up to that currency's minor unit. The quoted rate is source units per one destination unit. Total debit equals converted tuition plus the source-currency fee.

Balances appear on Payments only. Each source currency has a separate demo wallet; selecting a different currency does not perform an exchange. All session data resets on reload. Only language preference is stored locally.

## Examples and evidence
Three read-only authored examples show SETTLED, PENDING and REVIEW_REQUIRED outcomes. Examples cannot be reconciled and never affect the visitor's wallets. Session transfers are displayed separately. The evidence view shows planning, explicit approval, reservation and receipt outcomes; JSON exports identify the simulation and sample flags.

## Sharing
Once public access is enabled, reviewers can visit `/` without ChatGPT or Gmail. Mainland China reachability has not been verified. Test the actual hostname from the intended network; public access is not evidence of network reachability. No VPN-dependent flow is required by the demo.

`/tuitionguard-offline.html` is a single HTML artifact containing React, all application logic, translations and CSS. Download and open it in a modern desktop browser, or host that same file on an independently provisioned static host accessible to reviewers. It requires no external scripts, fonts, APIs or sign-in. No alternative host has been provisioned as part of this update.

## Verification
Run `node --experimental-strip-types tests/judge-engine.mjs`: 52 checks over six currency directions, approval, expiry, changed terms, duplicate prevention, pending/mismatched/rejected receipt handling and language dictionary coverage.
Run `node scripts/build-offline.mjs` to regenerate the self-contained file.
Existing server checks remain separate. Direct browser interaction and a mainland-China network test remain outstanding.
