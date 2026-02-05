# PROJECT KNOWLEDGE BASE

## OVERVIEW

TypeScript money library using BigInt subunits for precision-safe monetary calculations. Zero runtime dependencies.

**Runtime**: Node.js 18+ (requires BigInt, native test runner)  
**Package**: `@cbrunnkvist/subunit-money`

## COMMANDS

```bash
npm run build    # tsc → dist/
npm test         # node --import tsx --test test/*.test.ts
npm run lint     # tsc --noEmit (type check only)
```

## DOCUMENTATION

- **[Architecture & Code Map](./doc/architecture.md)** - Project structure, where to find things, unique patterns
- **[TypeScript Guide](./doc/typescript-guide.md)** - Conventions, anti-patterns, branded generics
- **[Testing Guide](./doc/testing-guide.md)** - Test patterns, LSP quirks with intentional errors
- **[Build & Distribution](./doc/build-and-dist.md)** - Dual format builds (CJS+ESM), dist/ workflow
- **[Lessons Learned](./doc/lessons-learned.md)** - Critical historical context (rounding bugs, decimal limits)
- **[Releases](./MAINTAINERS.md)** - Release procedures, versioning policy (maintainers only)

## CRITICAL NOTES

- **dist/ folder is tracked in git** - Commit dist/ changes WITH source changes
- **Banker's rounding** (IEEE 754-2008) is intentional, not a bug
- **LSP errors in tests** are intentional (currency mismatch tests)
- **Supports 0-30 decimal places** (cryptocurrencies like ETH, XNO)
