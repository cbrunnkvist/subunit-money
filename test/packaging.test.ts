import assert from 'node:assert'
import { describe, it } from 'node:test'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Integration test to verify that the library is correctly packaged
 * and consumable via both CommonJS (require) and ESM (import).
 * 
 * This test uses 'npm pack' to simulate a real installation.
 */
describe('Packaging Integration (Smoke Test)', () => {
  it('should be consumable via both CJS and ESM after npm pack', () => {
    // 1. Build the project
    execSync('npm run build', { stdio: 'ignore' })

    // 2. Create a tarball (simulates what gets uploaded to npm)
    const packOutput = execSync('npm pack', { encoding: 'utf8' }).trim()
    const tarballName = packOutput.split('\n').pop()!
    const tarballPath = join(process.cwd(), tarballName)

    // 3. Create a temporary consumer project
    const tempDir = mkdtempSync(join(tmpdir(), 'subunit-money-smoke-'))
    
    try {
      // Initialize temp project
      execSync('npm init -y', { cwd: tempDir, stdio: 'ignore' })
      
      // Install the local tarball
      execSync(`npm install ${tarballPath}`, { cwd: tempDir, stdio: 'ignore' })

      // 4. Test CommonJS usage
      const cjsPath = join(tempDir, 'test.cjs')
      writeFileSync(cjsPath, `
        const { Money } = require('subunit-money');
        const m = new Money('USD', 100);
        if (m.toString() !== '100.00 USD') {
          process.exit(1);
        }
        console.log('CJS Load Success');
      `)
      
      const cjsResult = execSync('node test.cjs', { cwd: tempDir, encoding: 'utf8' })
      assert.ok(cjsResult.includes('CJS Load Success'))

      // 5. Test ESM usage
      const esmPath = join(tempDir, 'test.mjs')
      writeFileSync(esmPath, `
        import { Money } from 'subunit-money';
        const m = new Money('EUR', 50);
        if (m.toString() !== '50.00 EUR') {
          process.exit(1);
        }
        console.log('ESM Load Success');
      `)
      
      const esmResult = execSync('node test.mjs', { cwd: tempDir, encoding: 'utf8' })
      assert.ok(esmResult.includes('ESM Load Success'))

    } finally {
      // Cleanup
      rmSync(tempDir, { recursive: true, force: true })
      rmSync(tarballPath, { force: true })
    }
  })
})
