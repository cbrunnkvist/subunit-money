import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import {
  Money,
  ExchangeRateService,
  MoneyConverter,
  registerCurrency,
  clearCurrencies,
  CurrencyMismatchError,
  CurrencyUnknownError,
  SubunitError,
  AmountError,
  ExchangeRateError,
} from '../lib/index.js'

describe('Money', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('EUR', 2)
    registerCurrency('JPY', 0)
    registerCurrency('BTC', 8)
  })

  describe('Creating money values', () => {
    it('accepts string amounts', () => {
      const money = new Money('USD', '19.99')
      assert.strictEqual(money.amount, '19.99')
      assert.strictEqual(money.currency, 'USD')
    })

    it('accepts number amounts', () => {
      const money = new Money('USD', 19.99)
      assert.strictEqual(money.amount, '19.99')
    })

    it('formats amounts with correct decimal places for the currency', () => {
      assert.strictEqual(new Money('USD', '1').amount, '1.00')
      assert.strictEqual(new Money('USD', '1.5').amount, '1.50')
      assert.strictEqual(new Money('JPY', '1000').amount, '1000')
      assert.strictEqual(new Money('BTC', '0.00000001').amount, '0.00000001')
    })

    it('rejects unknown currencies', () => {
      assert.throws(() => new Money('FAKE', '10'), CurrencyUnknownError)
    })

    it('rejects amounts with too many decimal places', () => {
      assert.throws(() => new Money('USD', '1.234'), SubunitError)
      assert.throws(() => new Money('JPY', '1.5'), SubunitError)
    })

    it('rejects invalid amount formats', () => {
      assert.throws(() => new Money('USD', 'abc'), AmountError)
      assert.throws(() => new Money('USD', '1.2.3'), AmountError)
      assert.throws(() => new Money('USD', ''), AmountError)
    })

    it('handles negative amounts', () => {
      const money = new Money('USD', '-19.99')
      assert.strictEqual(money.amount, '-19.99')
      assert.ok(money.isNegative())
    })

    it('handles zero', () => {
      const money = new Money('USD', '0')
      assert.strictEqual(money.amount, '0.00')
      assert.ok(money.isZero())
    })
  })

  describe('Arithmetic', () => {
    it('adds amounts of the same currency', () => {
      const a = new Money('USD', '10.00')
      const b = new Money('USD', '5.50')
      assert.strictEqual(a.add(b).amount, '15.50')
    })

    it('subtracts amounts of the same currency', () => {
      const a = new Money('USD', '10.00')
      const b = new Money('USD', '3.25')
      assert.strictEqual(a.subtract(b).amount, '6.75')
    })

    it('multiplies by a factor', () => {
      const price = new Money('USD', '100.00')
      assert.strictEqual(price.multiply(0.08).amount, '8.00')
      assert.strictEqual(price.multiply(1.5).amount, '150.00')
    })

    it('refuses to add different currencies', () => {
      const usd = new Money('USD', '10')
      const eur = new Money('EUR', '10')
      assert.throws(() => usd.add(eur), CurrencyMismatchError)
    })

    it('allocates proportionally without losing cents', () => {
      const total = new Money('USD', '100.00')
      const parts = total.allocate([1, 1, 1])

      assert.strictEqual(parts.length, 3)
      const sum = parts.reduce((acc, p) => acc.add(p), Money.zero('USD'))
      assert.strictEqual(sum.amount, '100.00')
    })

    it('distributes remainder to first allocations', () => {
      const total = new Money('USD', '10.00')
      const parts = total.allocate([1, 1, 1])
      
      assert.strictEqual(parts[0].amount, '3.34')
      assert.strictEqual(parts[1].amount, '3.33')
      assert.strictEqual(parts[2].amount, '3.33')
    })
  })

  describe('Comparisons', () => {
    it('compares equal amounts', () => {
      const a = new Money('USD', '10.00')
      const b = new Money('USD', '10.00')
      assert.ok(a.equalTo(b))
    })

    it('compares greater than', () => {
      const a = new Money('USD', '10.00')
      const b = new Money('USD', '5.00')
      assert.ok(a.greaterThan(b))
      assert.ok(!b.greaterThan(a))
    })

    it('compares less than', () => {
      const a = new Money('USD', '5.00')
      const b = new Money('USD', '10.00')
      assert.ok(a.lessThan(b))
    })

    it('refuses to compare different currencies', () => {
      const usd = new Money('USD', '10')
      const eur = new Money('EUR', '10')
      assert.throws(() => usd.equalTo(eur), CurrencyMismatchError)
    })

    it('provides a compare function for sorting', () => {
      const amounts = [
        new Money('USD', '30'),
        new Money('USD', '10'),
        new Money('USD', '20'),
      ]
      amounts.sort(Money.compare)
      assert.strictEqual(amounts[0].amount, '10.00')
      assert.strictEqual(amounts[1].amount, '20.00')
      assert.strictEqual(amounts[2].amount, '30.00')
    })
  })

  describe('Serialization', () => {
    it('converts to JSON-safe object', () => {
      const money = new Money('USD', '19.99')
      const json = money.toJSON()
      assert.deepStrictEqual(json, { currency: 'USD', amount: '19.99' })
    })

    it('survives JSON round-trip', () => {
      const original = new Money('USD', '19.99')
      const json = JSON.stringify(original)
      const parsed = JSON.parse(json)
      const restored = Money.fromObject(parsed)
      assert.strictEqual(restored.amount, '19.99')
      assert.strictEqual(restored.currency, 'USD')
    })

    it('converts to string representation', () => {
      const money = new Money('USD', '19.99')
      assert.strictEqual(money.toString(), '19.99 USD')
    })

    it('converts to subunits for database storage', () => {
      const money = new Money('USD', '19.99')
      assert.strictEqual(money.toSubunits(), 1999n)
    })

    it('creates from subunits', () => {
      const money = Money.fromSubunits(1999, 'USD')
      assert.strictEqual(money.amount, '19.99')
    })

    it('handles zero-decimal currencies in subunits', () => {
      const yen = new Money('JPY', '1000')
      assert.strictEqual(yen.toSubunits(), 1000n)
      
      const restored = Money.fromSubunits(1000, 'JPY')
      assert.strictEqual(restored.amount, '1000')
    })
  })
})

describe('ExchangeRateService', () => {
  it('stores and retrieves rates', () => {
    const service = new ExchangeRateService()
    service.setRate('USD', 'EUR', 0.92)

    const rate = service.getRate('USD', 'EUR')
    assert.ok(rate)
    assert.strictEqual(rate.from, 'USD')
    assert.strictEqual(rate.to, 'EUR')
    assert.strictEqual(Number(rate.rate).toFixed(2), '0.92')
  })

  it('auto-creates inverse rates', () => {
    const service = new ExchangeRateService()
    service.setRate('USD', 'EUR', 0.92)

    const inverse = service.getRate('EUR', 'USD')
    assert.ok(inverse)
    assert.ok(Number(inverse.rate) > 1)
  })

  it('returns rate of 1 for same currency', () => {
    const service = new ExchangeRateService()
    const rate = service.getRate('USD', 'USD')
    assert.ok(rate)
    assert.strictEqual(rate.rate, '1')
  })

  it('detects rate discrepancies', () => {
    const service = new ExchangeRateService()
    service.setRate('USD', 'EUR', 0.92, 'source1', false)
    service.setRate('EUR', 'USD', 1.10, 'source2', false)

    const pair = service.getRatePair('USD', 'EUR')
    assert.ok(pair)
    assert.ok(pair.discrepancy > 0)
  })
})

describe('MoneyConverter', () => {
  let service: ExchangeRateService
  let converter: MoneyConverter

  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('EUR', 2)
    registerCurrency('GBP', 2)
    registerCurrency('JPY', 0)

    service = new ExchangeRateService()
    service.setRate('USD', 'EUR', 0.92)
    service.setRate('USD', 'GBP', 0.79)
    converter = new MoneyConverter(service)
  })

  it('converts between currencies', () => {
    const usd = new Money('USD', '100.00')
    const eur = converter.convert(usd, 'EUR')

    assert.strictEqual(eur.currency, 'EUR')
    assert.strictEqual(eur.amount, '92.00')
  })

  it('throws when no rate exists', () => {
    const usd = new Money('USD', '100')
    assert.throws(() => converter.convert(usd, 'JPY' as any), ExchangeRateError)
  })

  it('adds amounts in different currencies', () => {
    const usd = new Money('USD', '100.00')
    const eur = new Money('EUR', '50.00')

    const totalInUSD = converter.add(usd, eur, 'USD')
    assert.strictEqual(totalInUSD.currency, 'USD')
    assert.ok(Number(totalInUSD.amount) > 150)
  })

  it('sums multiple currencies', () => {
    const amounts = [
      new Money('USD', '100'),
      new Money('EUR', '100'),
      new Money('GBP', '100'),
    ]

    const total = converter.sum(amounts, 'USD')
    assert.strictEqual(total.currency, 'USD')
    assert.ok(Number(total.amount) > 300)
  })

  it('calculates percentage across currencies', () => {
    const part = new Money('EUR', '46.00')
    const whole = new Money('USD', '100.00')

    const percentage = converter.percentageOf(part, whole)
    assert.ok(percentage > 49 && percentage < 51)
  })
})

describe('Cryptocurrency support', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('BTC', 8)
    registerCurrency('ETH', 18)
    registerCurrency('XNO', 30)
  })

  it('handles Bitcoin with 8 decimal places', () => {
    const btc = new Money('BTC', '0.00000001')
    assert.strictEqual(btc.amount, '0.00000001')
    assert.strictEqual(btc.toSubunits(), 1n)
  })

  it('does arithmetic on Bitcoin amounts', () => {
    const a = new Money('BTC', '1.00000000')
    const b = new Money('BTC', '0.00000001')
    assert.strictEqual(a.add(b).amount, '1.00000001')
  })

  it('handles Ethereum with 18 decimal places', () => {
    const oneWei = new Money('ETH', '0.000000000000000001')
    assert.strictEqual(oneWei.amount, '0.000000000000000001')
    assert.strictEqual(oneWei.toSubunits(), 1n)

    const oneEth = new Money('ETH', '1.000000000000000000')
    assert.strictEqual(oneEth.toSubunits(), 10n ** 18n)
  })

  it('does arithmetic on Ethereum amounts', () => {
    const a = new Money('ETH', '1.000000000000000000')
    const b = new Money('ETH', '0.000000000000000001')
    assert.strictEqual(a.add(b).amount, '1.000000000000000001')
    assert.strictEqual(a.subtract(b).amount, '0.999999999999999999')
  })

  it('handles Nano with 30 decimal places', () => {
    const oneRaw = new Money('XNO', '0.000000000000000000000000000001')
    assert.strictEqual(oneRaw.amount, '0.000000000000000000000000000001')
    assert.strictEqual(oneRaw.toSubunits(), 1n)

    const oneNano = new Money('XNO', '1.000000000000000000000000000000')
    assert.strictEqual(oneNano.toSubunits(), 10n ** 30n)
  })

  it('does arithmetic on Nano amounts', () => {
    const a = new Money('XNO', '1.000000000000000000000000000000')
    const b = new Money('XNO', '0.000000000000000000000000000001')
    assert.strictEqual(a.add(b).amount, '1.000000000000000000000000000001')
  })

  it('preserves precision through subunit round-trip for high-decimal currencies', () => {
    const ethAmount = Money.fromSubunits(123456789012345678n, 'ETH')
    assert.strictEqual(ethAmount.toSubunits(), 123456789012345678n)

    const xnoAmount = Money.fromSubunits(10n ** 30n + 1n, 'XNO')
    assert.strictEqual(xnoAmount.toSubunits(), 10n ** 30n + 1n)
  })

  it('allocates high-decimal currencies without losing precision', () => {
    const nano = new Money('XNO', '1.000000000000000000000000000000')
    const parts = nano.allocate([1, 1, 1])
    const sum = parts.reduce((a, b) => a.add(b))
    assert.strictEqual(sum.amount, nano.amount)
  })
})

describe('High-value fiat currencies', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('VND', 0)
  })

  it('handles Vietnamese Dong with 0 decimal places', () => {
    const vnd = new Money('VND', '50000')
    assert.strictEqual(vnd.amount, '50000')
    assert.strictEqual(vnd.toSubunits(), 50000n)
  })

  it('handles house-price-scale amounts in VND', () => {
    const housePrice = new Money('VND', '2000000000')
    assert.strictEqual(housePrice.amount, '2000000000')
    assert.strictEqual(housePrice.toSubunits(), 2000000000n)

    const tax = housePrice.multiply(0.02)
    assert.strictEqual(tax.amount, '40000000')
  })

  it('allocates large VND amounts correctly', () => {
    const total = new Money('VND', '1000000000')
    const parts = total.allocate([70, 20, 10])
    
    assert.strictEqual(parts[0].amount, '700000000')
    assert.strictEqual(parts[1].amount, '200000000')
    assert.strictEqual(parts[2].amount, '100000000')
    
    const sum = parts.reduce((a, b) => a.add(b))
    assert.strictEqual(sum.amount, total.amount)
  })
})

describe('Bug regression tests', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('EUR', 2)
  })

  describe('multiply() must round, not truncate', () => {
    it('rounds 0.999 up to 1.00', () => {
      const money = new Money('USD', '1.00')
      assert.strictEqual(money.multiply(0.999).amount, '1.00')
    })

    it('rounds 1.999 up to 2.00', () => {
      const money = new Money('USD', '1.00')
      assert.strictEqual(money.multiply(1.999).amount, '2.00')
    })

    it('rounds tax calculation correctly: 19.99 * 0.0825 = 1.65', () => {
      // 19.99 * 0.0825 = 1.649175, which should round to 1.65
      const price = new Money('USD', '19.99')
      assert.strictEqual(price.multiply(0.0825).amount, '1.65')
    })

    it('rounds 0.555 to 0.56 (banker\'s rounding)', () => {
      const money = new Money('USD', '1.00')
      assert.strictEqual(money.multiply(0.555).amount, '0.56')
    })

    it('rounds 0.5 boundary correctly with banker\'s rounding', () => {
      const money = new Money('USD', '1.00')
      // 1.00 * 0.005 = 0.005 → banker's: digit before 5 is 0 (even), round down
      assert.strictEqual(money.multiply(0.005).amount, '0.00')
      // 1.00 * 0.015 = 0.015 → banker's: digit before 5 is 1 (odd), round up
      assert.strictEqual(money.multiply(0.015).amount, '0.02')
    })
  })

  describe('allocate() must reject invalid proportions', () => {
    it('rejects negative proportions', () => {
      const money = new Money('USD', '100.00')
      assert.throws(() => money.allocate([-1, 2]), TypeError)
    })

    it('rejects proportions containing NaN', () => {
      const money = new Money('USD', '100.00')
      assert.throws(() => money.allocate([1, NaN, 1]), TypeError)
    })

    it('rejects proportions containing Infinity', () => {
      const money = new Money('USD', '100.00')
      assert.throws(() => money.allocate([1, Infinity]), TypeError)
    })
  })

  describe('MoneyConverter must validate target currency', () => {
    it('throws CurrencyUnknownError for unregistered target currency', () => {
      const service = new ExchangeRateService()
      service.setRate('USD', 'XYZ', 1.5)
      const converter = new MoneyConverter(service)
      const usd = new Money('USD', '100.00')
      
      // XYZ is not registered as a currency
      assert.throws(() => converter.convert(usd, 'XYZ'), CurrencyUnknownError)
    })
  })
})

describe("Banker's rounding (round half-to-even) compliance", () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
  })

  it('rounds 0.555 to 0.56 (5 is odd, round up to even 6)', () => {
    const money = new Money('USD', '1.00')
    assert.strictEqual(money.multiply(0.555).amount, '0.56')
  })

  it('rounds 0.545 to 0.54 (4 is even, round down to stay even)', () => {
    const money = new Money('USD', '1.00')
    assert.strictEqual(money.multiply(0.545).amount, '0.54')
  })

  it('rounds 0.565 to 0.56 (6 is even, round down to stay even)', () => {
    const money = new Money('USD', '1.00')
    assert.strictEqual(money.multiply(0.565).amount, '0.56')
  })

  it('rounds 0.575 to 0.58 (7 is odd, round up to even 8)', () => {
    const money = new Money('USD', '1.00')
    assert.strictEqual(money.multiply(0.575).amount, '0.58')
  })

  it('rounds 0.585 to 0.58 (8 is even, round down to stay even)', () => {
    const money = new Money('USD', '1.00')
    assert.strictEqual(money.multiply(0.585).amount, '0.58')
  })

  it('rounds 0.595 to 0.60 (9 is odd, round up to even 0)', () => {
    const money = new Money('USD', '1.00')
    assert.strictEqual(money.multiply(0.595).amount, '0.60')
  })

  it("handles negative amounts with banker's rounding", () => {
    const money = new Money('USD', '-1.00')
    assert.strictEqual(money.multiply(0.555).amount, '-0.56')
    assert.strictEqual(money.multiply(0.545).amount, '-0.54')
  })

  it('prevents systematic bias over many transactions', () => {
    const money = new Money('USD', '1.00')
    
    // With banker's rounding, half values alternate between rounding up and down
    // based on whether the preceding digit is odd or even
    const results = [
      money.multiply(0.545),  // 4 is even → 0.54
      money.multiply(0.555),  // 5 is odd  → 0.56
      money.multiply(0.565),  // 6 is even → 0.56
      money.multiply(0.575),  // 7 is odd  → 0.58
      money.multiply(0.585),  // 8 is even → 0.58
      money.multiply(0.595),  // 9 is odd  → 0.60
    ]
    
    const sum = results.reduce((acc, m) => acc.add(m), Money.zero('USD'))
    // True sum: 0.545+0.555+0.565+0.575+0.585+0.595 = 3.42
    // Half-up would give: 0.55+0.56+0.57+0.58+0.59+0.60 = 3.45 (biased high)
    // Banker's gives: 0.54+0.56+0.56+0.58+0.58+0.60 = 3.42 (unbiased)
    assert.strictEqual(sum.amount, '3.42')
  })

  it('works correctly with larger multipliers', () => {
    const money = new Money('USD', '10.00')
    // 10.00 * 0.0545 = 0.545 → should round to 0.54 (4 is even)
    assert.strictEqual(money.multiply(0.0545).amount, '0.54')
    // 10.00 * 0.0555 = 0.555 → should round to 0.56 (5 is odd)
    assert.strictEqual(money.multiply(0.0555).amount, '0.56')
  })

  it('works with large amounts', () => {
    const large = new Money('USD', '1000000000.00')
    // 1000000000.00 * 0.00000545 = 5450.00
    assert.strictEqual(large.multiply(0.00000545).amount, '5450.00')
    // 1000000000.00 * 0.00000555 = 5550.00
    assert.strictEqual(large.multiply(0.00000555).amount, '5550.00')
  })
})

describe('MoneyConverter precision with BigInt arithmetic', () => {
  let service: ExchangeRateService
  let converter: MoneyConverter

  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('EUR', 2)
    registerCurrency('BTC', 8)
    registerCurrency('JPY', 0)

    service = new ExchangeRateService()
    converter = new MoneyConverter(service)
  })

  it('preserves precision for large cryptocurrency conversions', () => {
    service.setRate('BTC', 'USD', '43500.00')
    
    const btc = new Money('BTC', '1000.00000001')
    const usd = converter.convert(btc, 'USD')
    
    // 1000.00000001 × 43500 = 43500000.00435
    // Should round to 43500000.00 (4 is even, round down)
    assert.strictEqual(usd.amount, '43500000.00')
  })

  it('handles fractional rates with zero-decimal currencies', () => {
    service.setRate('USD', 'JPY', '149.50')
    
    const usd = new Money('USD', '100.00')
    const jpy = converter.convert(usd, 'JPY')
    
    // 100 × 149.50 = 14950 (exact)
    assert.strictEqual(jpy.amount, '14950')
  })

  it("applies banker's rounding in currency conversion", () => {
    // 100.55 USD * 0.92 = 92.506 → 92.50 (0 is even, round down)
    // 100.65 USD * 0.92 = 92.598 → 92.60 (rounds up, not a half case)
    service.setRate('USD', 'EUR', '0.92')
    
    const usd1 = new Money('USD', '100.55')
    const usd2 = new Money('USD', '100.65')
    
    assert.strictEqual(converter.convert(usd1, 'EUR').amount, '92.51')
    assert.strictEqual(converter.convert(usd2, 'EUR').amount, '92.60')
  })

  it('does not lose precision with very small rates', () => {
    service.setRate('BTC', 'USD', '0.00001')  // Hypothetical tiny rate
    
    const btc = new Money('BTC', '100000000.00000000')  // 100M BTC
    const usd = converter.convert(btc, 'USD')
    
    // 100000000 × 0.00001 = 1000.00
    assert.strictEqual(usd.amount, '1000.00')
  })

  it('handles conversion with rates having many decimals', () => {
    service.setRate('USD', 'EUR', '0.923456789')
    
    const usd = new Money('USD', '100.00')
    const eur = converter.convert(usd, 'EUR')
    
    // 100 × 0.923456789 = 92.3456789 → 92.34 (4 is even, round down from .345...)
    // Actually .345... > .5 so it rounds up to 92.35
    assert.strictEqual(eur.amount, '92.35')
  })
})

describe('Edge cases that would break if implementation deviates', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('JPY', 0)
  })

  it('avoids floating point errors: 0.1 + 0.2', () => {
    const a = new Money('USD', '0.10')
    const b = new Money('USD', '0.20')
    assert.strictEqual(a.add(b).amount, '0.30')
  })

  it('avoids floating point errors: 100 * 1.1', () => {
    const money = new Money('USD', '100.00')
    assert.strictEqual(money.multiply(1.1).amount, '110.00')
  })

  it('handles large amounts without precision loss', () => {
    const large = new Money('USD', '999999999999.99')
    assert.strictEqual(large.amount, '999999999999.99')
    assert.strictEqual(large.toSubunits(), 99999999999999n)
  })

  it('preserves exact amounts through subunit round-trip', () => {
    const original = new Money('USD', '123.45')
    const subunits = original.toSubunits()
    const restored = Money.fromSubunits(subunits, 'USD')
    assert.strictEqual(restored.amount, original.amount)
  })

  it('allocate never loses money', () => {
    const amounts = ['100.00', '99.99', '0.03', '1000.00']
    for (const amt of amounts) {
      const money = new Money('USD', amt)
      const parts = money.allocate([1, 1, 1])
      const sum = parts.reduce((a, b) => a.add(b))
      assert.strictEqual(sum.amount, money.amount, `Failed for ${amt}`)
    }
  })
})
