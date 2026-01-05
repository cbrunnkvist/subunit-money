import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import util from 'node:util'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Money,
  registerCurrency,
  clearCurrencies,
  loadCurrencyMap,
} from '../lib/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const stockMap = JSON.parse(readFileSync(join(rootDir, 'currencymap.json'), 'utf8'))

describe('Money Debug and Display', () => {
  describe('Stock ISO Currencies', () => {
    beforeEach(() => {
      clearCurrencies()
      loadCurrencyMap(stockMap)
    })

    it('works for standard 2-decimal currencies (USD)', () => {
      const usd = new Money('USD', '10.5')
      assert.strictEqual(usd.amount, '10.50')
      assert.strictEqual(usd.displayAmount, '10.50')
      assert.strictEqual(usd.toString(), '10.50 USD')
    })

    it('works for 0-decimal currencies (JPY)', () => {
      const yen = new Money('JPY', '1000')
      assert.strictEqual(yen.amount, '1000')
      assert.strictEqual(yen.displayAmount, '1000')
      assert.strictEqual(yen.toString(), '1000 JPY')
    })
  })

  describe('Custom Registered Currencies', () => {
    beforeEach(() => {
      clearCurrencies()
      registerCurrency('XNO', 30, 2)
      registerCurrency('BTC', 8) // No displayDecimals override
    })

    it('respects displayDecimals override while preserving full precision', () => {
      const xno = new Money('XNO', '1337')
      assert.strictEqual(xno.amount, '1337.000000000000000000000000000000')
      assert.strictEqual(xno.displayAmount, '1337.00')
      assert.strictEqual(xno.toString(), '1337.00 XNO')
    })

    it('preserves significant digits even if they exceed displayAmount', () => {
      const xno = new Money('XNO', '1337.12345')
      assert.strictEqual(xno.displayAmount, '1337.12345')
    })

    it('uses smart default (2 decimals) if no override is provided', () => {
      const btc = new Money('BTC', '1.5')
      assert.strictEqual(btc.amount, '1.50000000')
      assert.strictEqual(btc.displayAmount, '1.50')
    })
  })

  describe('Overriding Stock Currencies', () => {
    beforeEach(() => {
      clearCurrencies()
      loadCurrencyMap(stockMap)
      // Override VND (normally 0 decimals) to 3 decimals with 1 display decimal
      registerCurrency('VND', 3, 1)
    })

    it('uses the overridden definition for display and precision', () => {
      const vnd = new Money('VND', '100.123')
      assert.strictEqual(vnd.amount, '100.123')
      assert.strictEqual(vnd.displayAmount, '100.123') // 3 sig digits > 1 preferred
      
      const vnd2 = new Money('VND', '100')
      assert.strictEqual(vnd2.amount, '100.000')
      assert.strictEqual(vnd2.displayAmount, '100.0') // Pad to 1 display decimal
    })
  })

  describe('Node.js Custom Inspection', () => {
    beforeEach(() => {
      clearCurrencies()
      registerCurrency('XNO', 30, 2)
      registerCurrency('BTC', 8) // No override, should default to 2
      registerCurrency('USD', 2)
    })

    it('uses the pretty format in util.inspect', () => {
      const xno = new Money('XNO', '1337')
      const inspected = util.inspect(xno)
      assert.ok(inspected.includes("displayAmount: '1337.00'"))
      assert.ok(inspected.includes("currency: 'XNO'"))
      assert.ok(inspected.includes("amount: '1337.000000000000000000000000000000'"))
    })

    it('uses smart default (2 decimals) for inspection if no override provided', () => {
      const btc = new Money('BTC', '1.5')
      const inspected = util.inspect(btc)
      assert.ok(inspected.includes("displayAmount: '1.50'"))
    })

    it('shows full precision in inspection if digits are significant', () => {
      const xno = new Money('XNO', '1337.12345')
      const inspected = util.inspect(xno)
      assert.ok(inspected.includes("displayAmount: '1337.12345'"))
    })
  })
})