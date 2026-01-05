import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import util from 'node:util'
import {
  Money,
  registerCurrency,
  clearCurrencies,
} from '../lib/index.js'

describe('Money Debug and Display', () => {
  beforeEach(() => {
    clearCurrencies()
    registerCurrency('USD', 2)
    registerCurrency('JPY', 0)
    registerCurrency('XNO', 30, 2)
    registerCurrency('BTC', 8) // No displayDecimals override
  })

  describe('Property-based display (Browser/General)', () => {
    it('provides displayAmount for standard fiat currencies', () => {
      const usd = new Money('USD', '10.5')
      assert.strictEqual(usd.amount, '10.50')
      assert.strictEqual(usd.displayAmount, '10.50')
      
      const yen = new Money('JPY', '1000')
      assert.strictEqual(yen.amount, '1000')
      assert.strictEqual(yen.displayAmount, '1000')
    })

    it('provides displayAmount for custom currencies with override', () => {
      const xno = new Money('XNO', '1337')
      // Full precision is preserved in .amount
      assert.strictEqual(xno.amount, '1337.000000000000000000000000000000')
      // .displayAmount is trimmed to displayDecimals
      assert.strictEqual(xno.displayAmount, '1337.00')
    })

    it('preserves significant digits even if they exceed displayAmount', () => {
      const xno = new Money('XNO', '1337.12345')
      assert.strictEqual(xno.displayAmount, '1337.12345')
    })

    it('defaults displayAmount to full precision if no override is provided', () => {
      const btc = new Money('BTC', '1.5')
      assert.strictEqual(btc.amount, '1.50000000')
      assert.strictEqual(btc.displayAmount, '1.50000000')
    })
  })

  describe('Node.js Custom Inspection', () => {
    it('uses the pretty format in util.inspect', () => {
      const xno = new Money('XNO', '1337')
      const inspected = util.inspect(xno)
      assert.ok(inspected.includes("amount: '1337.00'"))
      assert.ok(inspected.includes("currency: 'XNO'"))
      // Should not show the 30-zero wall in the inspection
      assert.ok(!inspected.includes('000000000000000000000000000000'))
    })

    it('shows full precision in inspection if digits are significant', () => {
      const xno = new Money('XNO', '1337.12345')
      const inspected = util.inspect(xno)
      assert.ok(inspected.includes("amount: '1337.12345'"))
    })

    it('works for standard currencies', () => {
      const usd = new Money('USD', '19.99')
      const inspected = util.inspect(usd)
      assert.ok(inspected.includes("amount: '19.99'"))
      assert.ok(inspected.includes("currency: 'USD'"))
    })
  })

  describe('toString() consistency', () => {
    it('uses displayAmount in toString()', () => {
      const xno = new Money('XNO', '1337')
      assert.strictEqual(xno.toString(), '1337.00 XNO')
      
      const usd = new Money('USD', '19.9')
      assert.strictEqual(usd.toString(), '19.90 USD')
    })
  })
})
