# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-04
**Commit:** (pending)
**Branch:** typescript-v2

## OVERVIEW

TypeScript money library using BigInt subunits for precision-safe monetary calculations. Zero runtime dependencies.

## STRUCTURE

```
./
├── lib/           # Source (Money, ExchangeRateService, MoneyConverter)
├── test/          # Node native test runner tests
├── dist/          # Build output (ESM + types)
└── currencymap.json  # 120+ ISO 4217 currency definitions
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Core Money operations | `lib/money.ts` | Immutable value object, BigInt internals |
| Currency conversion | `lib/money-converter.ts` | Uses ExchangeRateService |
| Exchange rates | `lib/exchange-rate-service.ts` | Auto-inverse rates, discrepancy detection |
| Currency registry | `lib/currency.ts` | Runtime registration, `currencymap.json` |
| Error types | `lib/errors.ts` | 5 typed errors, extend native Error |
| Public API | `lib/index.ts` | All exports, auto-loads currencies |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `Money<C>` | class | money.ts | Core value object, generic currency param |
| `MoneyObject` | interface | money.ts | Serialization shape `{currency, amount}` |
| `ExchangeRateService` | class | exchange-rate-service.ts | Rate storage, inverse calculation |
| `MoneyConverter` | class | money-converter.ts | Cross-currency operations |
| `CurrencyDefinition` | type | currency.ts | `{decimalDigits: number}` |
| `INTERNAL_PRECISION` | const | money.ts | Minimum 8 decimals, scales up for high-decimal currencies |

## CONVENTIONS

- **Immutable**: All Money operations return new instances
- **String amounts**: `.amount` returns string (precision-safe for JSON/DB)
- **BigInt internal**: `#value` private, effective precision = max(8, currency decimals)
- **Banker's rounding**: IEEE 754-2008 round-half-to-even for all rounding operations
- **Round-per-multiply**: Each `multiply()` rounds immediately (prevents split penny problem)
- **ESM exports**: Use `.js` extension in imports (TypeScript compiles to ESM)
- **Branded generics**: `Money<'USD'>` for compile-time currency safety
- **Factory methods**: `Money.fromSubunits()`, `Money.zero()`, `Money.fromObject()`

## ANTI-PATTERNS

| Don't | Why | Do Instead |
|-------|-----|------------|
| `as any` / `@ts-ignore` | Defeats type safety | Fix the type issue |
| Direct arithmetic on `.amount` | String, not number | Use Money methods or `.toNumber()` |
| Modify Money instance | Immutable by design | Create new via operations |
| `.toNumber()` for storage | Precision loss | Use `.amount` (string) or `.toSubunits()` |
| Mix currencies without converter | Throws `CurrencyMismatchError` | Use `MoneyConverter` |

## UNIQUE PATTERNS

- **Auto-inverse rates**: Setting USD→EUR auto-creates EUR→USD
- **Allocate method**: Distributes amount by ratios, never loses cents
- **Discrepancy detection**: `getRatePair(currencyA, currencyB)` returns forward/reverse rates with discrepancy value
- **Subunit storage**: DB stores `toSubunits()` (BigInt), restore via `fromSubunits()`

## COMMANDS

```bash
npm run build    # tsc → dist/
npm test         # node --import tsx --test test/*.test.ts
npm run lint     # tsc --noEmit (type check only)
```

## NOTES

- **Node 18+** required (BigInt, native test runner)
- Package: `@cbrunnkvist/subunit-money` v2.0.0
- Test file uses `node:test` and `node:assert` (no Jest/Vitest)
- `currencymap.json` loaded at import time via `lib/index.ts`

## CRITICAL LESSONS LEARNED

### Rounding Implementation Oversight (Jan 2026)

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

### High-Decimal Currency Support (Jan 2026)

**What Happened:**
Currencies with more than 8 decimal places (e.g., ETH with 18, XNO with 30) crashed with "Exponent must be positive" when accessing `.amount`, `.toSubunits()`, or using `.allocate()`.

**Root Cause:**
During the v2 BigInt rewrite, a fixed `INTERNAL_PRECISION = 8` was introduced. Five locations computed `10n ** BigInt(INTERNAL_PRECISION - decimals)`, which produces a negative exponent when `decimals > 8`.

The original es-money (v1) stored native subunits directly and had no such limit. The design drifted during BigInt adoption.

**The Fix:**
Use `Math.max(INTERNAL_PRECISION, decimals)` as effective precision in all 5 locations. Zero API changes, zero principle compromises. Parsing already handled high decimals correctly (padEnd doesn't truncate).

**Test Coverage Added:**
- Property-based test: currencies with 9-30 decimal places
- ETH (18 decimals): DeFi standard
- XNO (30 decimals): extreme precision
- VND (0 decimals, large values): high-value fiat

**v3 Consideration:**
Return to true subunit storage (like v1) rather than fixed-point. See TODO.md.
