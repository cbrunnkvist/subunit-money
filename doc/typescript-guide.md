# TypeScript Guide

## CONVENTIONS

- **Immutable**: All Money operations return new instances
- **String amounts**: `.amount` returns string (precision-safe for JSON/DB)
- **BigInt internal**: `#subunits` private, stores native currency subunits
- **Banker's rounding**: IEEE 754-2008 round-half-to-even for all rounding operations
- **Round-per-multiply**: Each `multiply()` rounds immediately (prevents split penny problem)
- **ESM exports**: Use `.js` extension in imports (TypeScript compiles to ESM)
- **Branded generics**: `Money<'USD'>` for compile-time currency safety
- **Factory methods**: `Money.fromSubunits()`, `Money.zero()`, `Money.fromObject()`

## ANTI-PATTERNS

| Don't | Why | Do Instead |
|-------|-----|------------|
| Direct arithmetic on `.amount` | String, not number | Use Money methods or `.toNumber()` |
| Modify Money instance | Immutable by design | Create new via operations |
| `.toNumber()` for storage | Precision loss | Use `.amount` (string) or `.toSubunits()` |
| Mix currencies without converter | Throws `CurrencyMismatchError` | Use `MoneyConverter` |

## TYPE SAFETY

The library uses branded generic types (`Money<'USD'>`, `Money<'EUR'>`) to catch currency mismatches at compile time. See [Testing Guide](./testing-guide.md) for how tests intentionally bypass this for runtime verification.
