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

    it('rounds 0.555 to 0.56 (round half up)', () => {
      const money = new Money('USD', '1.00')
      assert.strictEqual(money.multiply(0.555).amount, '0.56')
    })

    it('rounds 0.5 boundary correctly', () => {
      const money = new Money('USD', '1.00')
      // 1.00 * 0.005 = 0.005, rounds to 0.01
      assert.strictEqual(money.multiply(0.005).amount, '0.01')
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
