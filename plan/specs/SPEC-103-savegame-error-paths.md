# SPEC-103 — Cover saveGame's quota/rethrow error branches

**Wave:** Cycle-9 / C9-P0 (coverage — the save durability boundary). **Risk:** LOW (test-only, isolated mock).
Reversible.

## Description + Impact
`saveGame` (persistence) wraps a `QuotaExceededError` DOMException as a `SaveQuotaError` (SPEC-10) and
re-throws any other error unchanged — genuine error handling on the save boundary, previously untested (store.
test exercises only the success/round-trip path; ~36% branch). Added store-errors.test (isolated idb-keyval
mock): a QuotaExceededError → SaveQuotaError (named, with the slot); a generic error → re-thrown unchanged
(not wrapped); success → resolves.

## DoD + Acceptance
- [x] store-errors.test +3 (quota→SaveQuotaError; other→rethrow; success→resolves). pnpm verify EXIT 0 (336);
  golden untouched; audit clean.
