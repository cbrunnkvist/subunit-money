# Testing Guide

## TEST FRAMEWORK

- Uses Node.js native test runner (no Jest/Vitest)
- Test files use `node:test` and `node:assert`
- Command: `npm test` runs `node --import tsx --test test/*.test.ts`

## LSP/TYPESCRIPT "ERRORS" IN TEST FILES

**What You See:**
LSP diagnostics may show TypeScript errors in test files like:
```
test/money.test.ts:94:35 - Argument of type 'Money<"EUR">' is not assignable to parameter of type 'Money<"USD">'
test/money.test.ts:139:38 - Argument of type 'Money<"EUR">' is not assignable to parameter of type 'Money<"USD">'
```

**Why This Is NOT a Problem:**
These are **intentional test cases** that verify the runtime error handling. The tests intentionally pass mismatched currencies (e.g., USD + EUR) to verify that `CurrencyMismatchError` is thrown at runtime.

```typescript
// Lines 91-95 in money.test.ts - INTENTIONAL CURRENCY MISMATCH
it('refuses to add different currencies', () => {
  const usd = new Money('USD', '10')
  const eur = new Money('EUR', '10')
  assert.throws(() => usd.add(eur), CurrencyMismatchError)  // <-- TypeScript flags this
})
```

The branded generic types (`Money<'USD'>`, `Money<'EUR'>`) correctly catch this at compile time, which is the library's design. The tests verify the runtime safety net still works when type safety can't prevent mixing (e.g., currencies from databases or user input).

**Bottom Line:**
- ✅ Tests pass: 107/107
- ✅ These "errors" are expected and intentional
- ✅ Do NOT try to fix them
- ✅ `npm run lint` and `npm test` both pass
