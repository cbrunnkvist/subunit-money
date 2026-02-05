# Lessons Learned

Critical historical context documenting past bugs, design decisions, and their resolutions.

## Rounding Implementation Oversight (Jan 2026)

**What Happened:**
During the TypeScript v2 rewrite, the `multiply()` method had a comment promising "banker's rounding" but actually truncated results. When fixing the truncation bug (commit d1ffc14), we implemented "half-up rounding" instead of the originally intended banker's rounding, and then **changed the documentation to match the incorrect implementation** rather than implementing the correct algorithm.

**Why This Matters:**
- Banker's rounding (round half-to-even) is the financial industry standard (IEEE 754-2008)
- Half-up rounding introduces systematic upward bias over many transactions
- Some jurisdictions legally require banker's rounding for payroll/tax
- Changing docs to match bugs defeats the purpose of specifications

**Root Cause:**
- Insufficient understanding of rounding algorithms during bug fix
- No test cases for exact-half scenarios (0.555, 0.545, etc.)
- Didn't question why original spec said "banker's" vs "half-up"

**Prevention:**
1. When fixing bugs, always implement what the spec says, not what's easier
2. Add test cases for rounding edge cases (exact half values)
3. Consult financial software standards when making rounding decisions
4. Question why specifications use specific terminology

**Reference:**
- Commit 289b842: Original spec with "banker's rounding"
- Commit d1ffc14: Bug fix that implemented wrong algorithm
- Financial standard: IEEE 754-2008 recommends round-to-nearest-even as default

---

## High-Decimal Currency Support (Jan 2026)

**What Happened:**
Currencies with more than 8 decimal places (e.g., ETH with 18, XNO with 30) crashed with "Exponent must be positive" when accessing `.amount`, `.toSubunits()`, or using `.allocate()`.

**Root Cause:**
During the v2 BigInt rewrite, a fixed `INTERNAL_PRECISION = 8` was introduced. Five locations computed `10n ** BigInt(INTERNAL_PRECISION - decimals)`, which produces a negative exponent when `decimals > 8`.

The original es-money (v1) stored native subunits directly and had no such limit. The design drifted during BigInt adoption.

**The Fix (v3 Option A - True Subunit Storage):**
We overhauled the internal storage to keep "true subunits" (cents, wei, raw) directly in `#subunits`. This removed `INTERNAL_PRECISION` entirely, simplifying the logic and eliminating "negative exponent" bugs structurally.

We also upgraded `multiply()` to parse factors via `String()` conversion, ensuring that inputs like `0.545` are treated as exactly `0.545` (avoiding floating-point epsilon noise that broke Banker's Rounding tests).

**Test Coverage Added:**
- Property-based test: currencies with 9-30 decimal places
- ETH (18 decimals): DeFi standard
- XNO (30 decimals): extreme precision
- VND (0 decimals, large values): high-value fiat

---

## Release Procedures (Feb 2026)

**Where to Find Release Instructions:**
All release procedures are documented in [MAINTAINERS.md](../MAINTAINERS.md).

**For Future Agents:**
If asked to publish or release this library, **ALWAYS** consult MAINTAINERS.md first. Do NOT attempt to release without reading and understanding it.
