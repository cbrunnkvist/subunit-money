# Choosing a Money Library

The JavaScript ecosystem has dozens of money-related libraries. This guide helps you pick the right one for your use case.

## TL;DR Decision Tree

```
Need to store/calculate money safely?
├── Yes → Need BigInt precision?
│         ├── Yes → Prefer method chaining?
│         │         ├── Yes → subunit-money ✓
│         │         └── No (functional style) → dinero.js
│         └── No (floating-point OK) → currency.js
└── No → What do you need?
         ├── Raw precision math → big.js
         ├── Display formatting → Intl.NumberFormat
         └── Currency conversion rates → money.js
```

## Understanding the Categories

These libraries solve different problems. Mixing them up leads to poor choices.

### Money Value Objects

A Money Value Object prevents two classes of bugs:
1. **Floating-point errors** — `0.1 + 0.2 !== 0.3` in JavaScript
2. **Currency mixing** — Accidentally adding USD to EUR

If you're building e-commerce, invoicing, payroll, or anything that touches real money, you want one of these.

### Financial Math Libraries

These provide arbitrary-precision decimal arithmetic but have no concept of currency. Use them for:
- Tax rate calculations
- Interest computations
- Scientific/statistical work
- Building your own money abstraction

### Formatting Libraries

These turn `1234.5` into `"$1,234.50"` or `"1.234,50 €"`. They're display-layer concerns, orthogonal to how you store or calculate money.

---

## Money Value Object Libraries

| Library | Precision | API Style | TypeScript | Bundle | Rounding |
|---------|-----------|-----------|------------|--------|----------|
| **subunit-money** | BigInt | Method chaining | Native | ~5kb, zero deps | Banker's (half-even) |
| **dinero.js** v2 | BigInt | Functional | Native | ~12kb modular | Configurable |
| **currency.js** | Float + correction | Method chaining | DefinitelyTyped | ~1kb | Half-up |

### subunit-money

```typescript
const price = new Money('USD', '19.99')
const tax = price.multiply(0.08)
const total = price.add(tax)
total.amount  // "21.59"
```

**Strengths:**
- BigInt precision with simple OOP API
- Banker's rounding by default (IEEE 754-2008 standard)
- TypeScript-native with branded currency generics
- Zero dependencies, batteries-included (120+ currencies)
- `allocate()` for fair distribution without losing pennies

**Trade-offs:**
- Smaller community than dinero.js
- No locale-aware formatting (by design)
- Single rounding mode (by design)

**Best for:** Teams who want precision guarantees without ceremony.

### dinero.js (v2)

```typescript
import { dinero, add, multiply, toDecimal } from 'dinero.js'
import { USD } from '@dinero.js/currencies'

const price = dinero({ amount: 1999, currency: USD })
const total = add(price, multiply(price, { amount: 8, scale: 2 }))
toDecimal(total)  // "21.59"
```

**Strengths:**
- Mature, well-documented, large community
- Functional/composable API
- Configurable rounding modes
- Modular currency packages (tree-shakeable)

**Trade-offs:**
- Verbose for simple operations
- Requires separate currency package imports
- Functional style isn't everyone's preference

**Best for:** Teams who prefer functional programming and need maximum flexibility.

### currency.js

```javascript
const price = currency(19.99)
const total = price.add(price.multiply(0.08))
total.value  // 21.59
```

**Strengths:**
- Tiny bundle (~1kb)
- Dead simple API
- Built-in formatting

**Trade-offs:**
- Uses floating-point internally (corrected, but not BigInt)
- Basic TypeScript support (DefinitelyTyped)
- No currency type safety

**Best for:** Simple e-commerce where bundle size matters more than edge-case precision.

---

## Financial Math Libraries

Use these when you need raw precision arithmetic without currency semantics.

| Library | Weekly Downloads | Focus |
|---------|-----------------|-------|
| **big.js** | ~12M | Minimalist, fast, financial |
| **decimal.js** | ~5M | Scientific functions (trig, logs) |
| **bignumber.js** | ~5M | Legacy/crypto compatibility |

All three are by the same author (MikeMcl). Choose based on needs:

- **big.js** — Smallest, fastest, covers 99% of financial math
- **decimal.js** — Need `sin()`, `log()`, non-integer powers
- **bignumber.js** — Working with legacy code or crypto/Web3

**Note:** These are precision libraries, not money libraries. They won't prevent you from adding USD to EUR or handle rounding conventions for you.

---

## Formatting

For display formatting, use the platform:

```typescript
const money = new Money('USD', '1234.56')

// Use Intl.NumberFormat for display
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: money.currency
}).format(money.toNumber())  // "$1,234.56"

new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: money.currency
}).format(money.toNumber())  // "1.234,56 $"
```

`Intl.NumberFormat` is:
- Built into every browser and Node.js
- Zero bundle cost
- Handles all locales correctly
- The right layer for this concern

Libraries like **numbro** or **accounting.js** exist but are largely unnecessary now that `Intl` is universal.

---

## Where subunit-money Fits

**subunit-money** sits between currency.js (pragmatic but imprecise) and dinero.js (precise but ceremony-heavy).

Choose subunit-money if you:
- Want BigInt precision with method-chaining ergonomics
- Are onboard with banker's rounding as the sensible default
- Prefer TypeScript-native over bolted-on types
- Value simplicity over configurability

### What subunit-money Doesn't Do (By Design)

| Feature | Why Not | What to Use Instead |
|---------|---------|---------------------|
| Display formatting | View-layer concern | `Intl.NumberFormat` |
| Advanced financial functions (NPV, IRR, amortization) | Out of scope for a value object | `financial`, `formulajs`, or big.js + your own math |
| Custom rounding modes | Banker's rounding is correct for finance | Do arithmetic externally, construct Money from result |
| 18-decimal precision | 8 decimals handles BTC; 18 is extreme edge case | Use decimal.js directly for ETH wei |

---

## Summary

| Your Situation | Recommendation |
|----------------|----------------|
| General e-commerce, invoicing, payroll | **subunit-money** or **dinero.js** |
| Tiny bundle is critical | **currency.js** |
| Functional programming team | **dinero.js** |
| Backend tax/interest calculations only | **big.js** |
| Currency conversion API integration | **money.js** |
| Display formatting | **Intl.NumberFormat** (built-in) |

---

## Resources

- [subunit-money on GitHub](https://github.com/cbrunnkvist/subunit-money)
- [dinero.js documentation](https://v2.dinerojs.com/)
- [currency.js documentation](https://currency.js.org/)
- [big.js on GitHub](https://github.com/MikeMcl/big.js/)
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
