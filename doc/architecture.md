# Architecture & Code Map

## PROJECT STRUCTURE

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

## UNIQUE PATTERNS

- **Auto-inverse rates**: Setting USD→EUR auto-creates EUR→USD
- **Allocate method**: Distributes amount by ratios, never loses cents
- **Discrepancy detection**: `getRatePair(currencyA, currencyB)` returns forward/reverse rates with discrepancy value
- **Subunit storage**: DB stores `toSubunits()` (BigInt), restore via `fromSubunits()`
