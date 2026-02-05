# Maintainer Documentation

This document contains information for maintainers of the `subunit-money` library.

## Releasing

### Overview

The release process is automated via npm lifecycle scripts. The library uses [Semantic Versioning](https://semver.org/).

### Before You Release

1. Ensure all changes are committed and the working directory is clean
2. Run tests locally: `npm test`
3. Check that `npm run lint` passes
4. Review the [CHANGELOG](./CHANGELOG.md) or commit history since last release

### Release Commands

Choose the appropriate version bump:

```bash
# Patch release: bug fixes (3.2.1 → 3.2.2)
npm run release:patch

# Minor release: new features, backwards compatible (3.2.1 → 3.3.0)
npm run release:minor

# Major release: breaking changes (3.2.1 → 4.0.0)
npm run release:major
```

### What Happens During Release

The release scripts use npm's lifecycle hooks:

1. **preversion**: Verifies clean working directory and runs tests
2. **version**: Builds distribution files and stages them
3. npm creates version commit and tag (e.g., `v3.2.2`)
4. **postversion**: Pushes commit and tags to origin
5. **prepublishOnly**: Final verification before publishing to npm
6. Package is published to npm registry

### Manual Steps (if needed)

If the automated release fails, you can run steps manually:

```bash
# 1. Version bump (creates commit and tag)
npm version patch  # or minor/major

# 2. Push to remote
git push && git push --tags

# 3. Publish to npm
npm publish
```

### Release Checklist

- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Clean working directory (`git status`)
- [ ] Version bumped appropriately (patch/minor/major)
- [ ] Distribution files built and committed
- [ ] Git tag created and pushed
- [ ] Package published to npm
- [ ] Verify on npm: https://www.npmjs.com/package/subunit-money

### Files Included in Package

Per `package.json` `files` array:
- `dist/` - Built distribution files (CJS, ESM, TypeScript definitions)
- `currencymap.json` - ISO 4217 currency definitions
- `README.md` - Documentation

### Post-Release

After releasing, verify:
1. Check npm page shows new version
2. Test installation: `npm install subunit-money@latest`
3. Verify types are available for TypeScript consumers

## Versioning Policy

We follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Breaking Changes

For MAJOR version bumps, document breaking changes in:
- Git tag message (annotated tag)
- Consider creating a migration guide for significant changes

## Questions?

For questions about the release process, open an issue or contact the maintainers.
