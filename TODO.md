# TODO

## v2.x (Current)

### Bug: High-decimal currencies crash (>8 decimals)

Currencies with `decimalDigits > 8` (e.g., ETH at 18, XNO at 30) throw "Exponent must be positive" when accessing `.amount`. The bug is in output formatting, not storage.

**Root cause**: Five locations compute `INTERNAL_PRECISION - decimals` assuming the result is non-negative.

**Fix**: Use `Math.max(INTERNAL_PRECISION, decimals)` as effective precision. Zero API changes, zero principle compromises.

**Test coverage needed**:
1. Regression test proving the bug exists
2. ETH (18 decimals) - common DeFi case
3. XNO (30 decimals) - extreme precision case  
4. VND (0 decimals, large nominal values) - large fiat amounts

---

## v3 Consideration: Return to True Subunit Storage

### Background

The library is named "subunit-money" but v2 doesn't actually store subunits internally.

**Original es-money (v1)**: Stored native subunits directly.
```javascript
this[subunitAmount] = Math.round(amount * (1 / this[minDenomination]))
// USD $1.50 → 150 (cents)
// BTC 1.00000001 → 100000001 (satoshis)
```
Limitation: JavaScript `Number` maxes out at ~15 significant digits.

**Current v2**: Stores `amount * 10^8` (fixed-point with `INTERNAL_PRECISION = 8`).
```typescript
const paddedFrac = frac.padEnd(INTERNAL_PRECISION, '0')
// USD $1.50 → 150000000n (cents * 10^6)
// BTC 1.00000001 → 100000001n (happens to equal satoshis)
```
Limitation: Breaks for currencies with >8 decimals. Design drifted from the "subunit" philosophy during BigInt adoption.

### Proposal: True Subunit Storage with BigInt

Store native subunits, leveraging BigInt's unlimited precision:
```typescript
// USD $1.50 → 150n (cents)
// BTC 1.00000001 → 100000001n (satoshis)
// XNO 1.000...001 → 1000000000000000000000000000001n (raw)
```

**Advantages**:
- Implementation matches the library's name and stated philosophy
- No `INTERNAL_PRECISION` constant needed
- No negative exponent bug possible
- Simpler `multiply()`: `subunits * factor → round to nearest subunit`
- Unlimited decimal support (whatever the currency defines)

**Considerations**:
- Intermediate precision during chained operations? (But we round per-multiply anyway to avoid split-penny, so this may be moot.)
- API remains unchanged; purely internal refactor
- Would need careful migration path if anyone depends on internal representation (they shouldn't—it's private)

### Decision

Defer to v3. For v2.x, apply the minimal fix (dynamic effective precision) to unblock high-decimal currencies without architectural changes.
