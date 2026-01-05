import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import fc from 'fast-check'
import {
  Money,
  registerCurrency,
  clearCurrencies,
} from '../lib/index.js'

/**
 * Property-based tests using fast-check.
 * 
 * These tests verify mathematical properties that should hold for ALL inputs,
 * not just handpicked examples. fast-check generates hundreds of random test cases
 * and shrinks failures to minimal reproducers.
 */

describe('Property-based tests', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('EUR', 2)
    registerCurrency('JPY', 0)
    registerCurrency('BTC', 8)
  })

  describe('Allocation properties', () => {
    it('never loses money when allocating', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 99999999n }), // 0 to $999,999.99
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 20 }),
          (subunits, proportions) => {
            const money = Money.fromSubunits(subunits, 'USD')
            const parts = money.allocate(proportions)
            const sum = parts.reduce((a, b) => a.add(b))
            return sum.equalTo(money)
          }
        )
      )
    })

    it('produces the correct number of allocations', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 99999999n }),
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 20 }),
          (subunits, proportions) => {
            const money = Money.fromSubunits(subunits, 'USD')
            const parts = money.allocate(proportions)
            return parts.length === proportions.length
          }
        )
      )
    })

    it('allocates zero as all zeros', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
          (proportions) => {
            const zero = Money.zero('USD')
            const parts = zero.allocate(proportions)
            return parts.every(p => p.isZero())
          }
        )
      )
    })
  })

  // These tests serve as executable specification for algebraic laws.
  // The underlying BigInt guarantees most of this, but we want to know
  // if refactoring ever breaks these interface guarantees.
  describe('Arithmetic properties', () => {
    it('satisfies commutativity of addition: a + b = b + a', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            return moneyA.add(moneyB).equalTo(moneyB.add(moneyA))
          }
        )
      )
    })

    it('satisfies associativity of addition: (a + b) + c = a + (b + c)', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b, c) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            const moneyC = Money.fromSubunits(c, 'USD')
            
            const left = moneyA.add(moneyB).add(moneyC)
            const right = moneyA.add(moneyB.add(moneyC))
            
            return left.equalTo(right)
          }
        )
      )
    })

    it('treats zero as additive identity: a + 0 = a', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a) => {
            const money = Money.fromSubunits(a, 'USD')
            const zero = Money.zero('USD')
            return money.add(zero).equalTo(money)
          }
        )
      )
    })

    it('handles subtraction as inverse of addition: a - b + b = a', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            
            return moneyA.subtract(moneyB).add(moneyB).equalTo(moneyA)
          }
        )
      )
    })

    it('treats 1 as multiplicative identity: a * 1 = a', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a) => {
            const money = Money.fromSubunits(a, 'USD')
            return money.multiply(1).equalTo(money)
          }
        )
      )
    })

    it('produces zero when multiplied by 0', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a) => {
            const money = Money.fromSubunits(a, 'USD')
            return money.multiply(0).isZero()
          }
        )
      )
    })
  })

  describe('Round-trip preservation', () => {
    it('preserves value after subunit round-trip', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999999n, max: 99999999999n }),
          (subunits) => {
            const money = Money.fromSubunits(subunits, 'USD')
            const restored = Money.fromSubunits(money.toSubunits(), 'USD')
            return money.equalTo(restored)
          }
        )
      )
    })

    it('preserves value after JSON round-trip', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999999n, max: 99999999999n }),
          (subunits) => {
            const money = Money.fromSubunits(subunits, 'USD')
            const json = JSON.stringify(money)
            const restored = Money.fromObject(JSON.parse(json))
            return money.equalTo(restored)
          }
        )
      )
    })

    it('preserves value after string amount round-trip', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999999n, max: 99999999999n }),
          (subunits) => {
            const money = Money.fromSubunits(subunits, 'USD')
            const restored = new Money('USD', money.amount)
            return money.equalTo(restored)
          }
        )
      )
    })
  })

  // Executable specification for total ordering axioms.
  // Same rationale as arithmetic properties above.
  describe('Comparison consistency', () => {
    it('maintains reflexivity: a = a', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a) => {
            const money = Money.fromSubunits(a, 'USD')
            return money.equalTo(money)
          }
        )
      )
    })

    it('maintains consistency between lessThan and greaterThanOrEqual', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            
            return moneyA.lessThan(moneyB) === !moneyA.greaterThanOrEqual(moneyB)
          }
        )
      )
    })

    it('maintains consistency between greaterThan and lessThanOrEqual', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            
            return moneyA.greaterThan(moneyB) === !moneyA.lessThanOrEqual(moneyB)
          }
        )
      )
    })

    it('maintains transitivity: if a < b and b < c, then a < c', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b, c) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            const moneyC = Money.fromSubunits(c, 'USD')
            
            // If the premise doesn't hold, property is vacuously true
            if (!(moneyA.lessThan(moneyB) && moneyB.lessThan(moneyC))) {
              return true
            }
            
            return moneyA.lessThan(moneyC)
          }
        )
      )
    })

    it('maintains antisymmetry: if a ≤ b and b ≤ a, then a = b', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (a, b) => {
            const moneyA = Money.fromSubunits(a, 'USD')
            const moneyB = Money.fromSubunits(b, 'USD')
            
            if (!(moneyA.lessThanOrEqual(moneyB) && moneyB.lessThanOrEqual(moneyA))) {
              return true
            }
            
            return moneyA.equalTo(moneyB)
          }
        )
      )
    })
  })

  describe('Sign properties', () => {
    it('correctly identifies positive amounts', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 1n, max: 99999999n }),
          (a) => {
            const money = Money.fromSubunits(a, 'USD')
            return money.isPositive() && !money.isNegative() && !money.isZero()
          }
        )
      )
    })

    it('correctly identifies negative amounts', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: -1n }),
          (a) => {
            const money = Money.fromSubunits(a, 'USD')
            return money.isNegative() && !money.isPositive() && !money.isZero()
          }
        )
      )
    })

    it('correctly identifies zero', () => {
      const zero = Money.zero('USD')
      assert.ok(zero.isZero())
      assert.ok(!zero.isPositive())
      assert.ok(!zero.isNegative())
    })
  })

  describe('Currency-specific properties', () => {
    it('preserves zero-decimal currency precision (JPY)', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -99999999n, max: 99999999n }),
          (subunits) => {
            const yen = Money.fromSubunits(subunits, 'JPY')
            assert.ok(!yen.amount.includes('.'), `JPY should have no decimal: ${yen.amount}`)
            return true
          }
        )
      )
    })

    it('preserves high-precision currency (BTC)', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 100000000n }), // 1 BTC in satoshis
          (satoshis) => {
            const btc = Money.fromSubunits(satoshis, 'BTC')
            const restored = Money.fromSubunits(btc.toSubunits(), 'BTC')
            return btc.equalTo(restored)
          }
        )
      )
    })

    it('supports currencies with more than 8 decimal places', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 9, max: 30 }),
          fc.bigInt({ min: 0n, max: 10n ** 20n }),
          (decimals, subunits) => {
            clearCurrencies()
            registerCurrency('HIGH', decimals)
            
            const money = Money.fromSubunits(subunits, 'HIGH')
            const amount = money.amount
            const backToSubunits = money.toSubunits()
            const restored = Money.fromSubunits(backToSubunits, 'HIGH')
            
            return restored.equalTo(money) && backToSubunits === subunits
          }
        )
      )
    })
  })
})
