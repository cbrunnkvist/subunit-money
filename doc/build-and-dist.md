# Build & Distribution

## DUAL FORMAT DISTRIBUTION (CJS + ESM)

**The Decision:**
We intentionally ship both CommonJS (CJS) and ES Module (ESM) builds in the dist/ folder. This is not accidental - it's required for maximum compatibility.

**Why Both Formats:**
- **ESM**: Modern bundlers (Vite, Rollup, Webpack 5+) and Node.js ESM projects
- **CJS**: Node.js REPL (`require()`), older bundlers, and legacy projects
- Without CJS, users cannot `require('subunit-money')` in the Node REPL

**Files in dist/:**
- `index.js` + `index.js.map` - ESM build
- `index.cjs` + `index.cjs.map` - CommonJS build  
- `index.d.ts` + `index.d.cts` - TypeScript definitions for both formats

## CRITICAL WORKFLOW

The dist/ folder **IS tracked in git** (removed from .gitignore on Jan 3, 2026).

**When you make source changes:**
1. Run `npm run build` to update dist/
2. Commit **both** source changes AND dist/ changes together
3. The dist/ folder must be committed for the package to work correctly when installed

**Common Mistake:**
Forgetting to commit dist/ after building. Always verify with `git status` that dist/ changes are staged before committing.

## BUILD COMMAND

```bash
npm run build    # Runs tsc with dual output configuration
```

The TypeScript compiler generates both CJS and ESM outputs based on `tsconfig.json` configuration.
