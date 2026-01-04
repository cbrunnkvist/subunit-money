# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-03
**Commit:** 1b39893
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
| `INTERNAL_PRECISION` | const | money.ts | 8 decimals (crypto support) |

## CONVENTIONS

- **Immutable**: All Money operations return new instances
- **String amounts**: `.amount` returns string (precision-safe for JSON/DB)
- **BigInt internal**: `#value` private, 8 decimal precision multiplier
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
