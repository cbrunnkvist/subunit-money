# TODO

## v2.x (Current)

### Bug: High-decimal currencies crash (>8 decimals) - FIXED

Currencies with `decimalDigits > 8` (e.g., ETH at 18, XNO at 30) threw "Exponent must be positive".
Fixed in commit [pending] by adopting **True Subunit Storage** (see below).

---

## v3 Architecture: True Subunit Storage - IMPLEMENTED

### Background

The library is named "subunit-money" but v2 originally didn't store subunits internally. It used a fixed-point representation (`amount * 10^8`) which caused crashes for currencies with >8 decimals.

### Implementation

We have refactored the internal storage to keep **native subunits** directly (cents, satoshis, wei, raw), leveraging BigInt's unlimited precision.

**Changes:**
- Removed `INTERNAL_PRECISION` constant
- `#subunits` stores native currency units (e.g., 1 USD = 100n, 1 ETH = 10^18n)
- `multiply()` uses `String()` parsing to avoid floating-point noise and support arbitrary precision factors
- Zero API changes; fully backward compatible

**Advantages:**
- Implementation matches the library's name and stated philosophy
- No "negative exponent" bugs possible
- Simpler internal logic (no scale-up/scale-down hoops)
- Unlimited decimal support (whatever the currency defines)
