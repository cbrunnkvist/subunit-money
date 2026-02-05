# Audit Fixes: README vs Implementation Alignment

## TL;DR

> **Quick Summary**: Fix 6 discrepancies found during documentation audit. One error message bug fix, five documentation updates. No logic changes.
> 
> **Deliverables**:
> - Fixed error message in `CurrencyUnknownError`
> - Updated README: decimal claim, comparison methods, displayAmount section
> - Updated CHOOSING-A-MONEY-LIBRARY.md: removed outdated 18-decimal limitation
> - Added @internal JSDoc to 5 utility functions in lib/currency.ts
> 
> **Estimated Effort**: Quick (< 30 minutes)
> **Parallel Execution**: NO - sequential (edits to same files)
> **Critical Path**: Task 1 → Commit 1 → Tasks 2-6 → Commit 2

---

## Context

### Original Request
Fix 6 discrepancies identified during a full code review audit comparing README claims against actual implementation.

### Audit Findings Summary
The library is accurate and high-quality. These are minor polish items:

| # | Issue | Severity | Type |
|---|-------|----------|------|
| 1 | Error message says `Money.registerCurrency()` but export is `registerCurrency()` | HIGH | Bug |
| 2 | CHOOSING doc says 18-decimal is "extreme edge case" but v3 supports 30+ | MEDIUM | Outdated |
| 3 | README says "8+ decimal places" but should reflect arbitrary support | LOW | Undersells |
| 4 | `greaterThanOrEqual()` / `lessThanOrEqual()` not in README | LOW | Missing |
| 5 | `displayAmount` property undocumented | LOW | Missing |
| 6 | Utility functions undocumented | LOW | Missing |

### User Decisions (from interview)
- **Internal API**: JSDoc comments only in lib/currency.ts (no README mention)
- **displayAmount**: New "Display Formatting" subsection in README
- **18-decimal row**: Delete entirely (don't document what's no longer true)
- **Commits**: Two commits (bug fix separate from docs)

---

## Work Objectives

### Core Objective
Bring documentation into alignment with implementation. Fix one misleading error message.

### Concrete Deliverables
1. `lib/errors.ts` - Corrected error message
2. `README.md` - Updated decimal claim, added comparison methods, added Display Formatting section
3. `CHOOSING-A-MONEY-LIBRARY.md` - Removed outdated limitation row
4. `lib/currency.ts` - Added @internal JSDoc to 5 utility functions

### Definition of Done
- [x] `npm run lint` passes (no TypeScript errors)
- [x] `npm test` passes (all 107 tests)
- [x] `grep "Money.registerCurrency" lib/errors.ts` returns no matches
- [x] `grep "greaterThanOrEqual" README.md` returns matches
- [x] `grep "displayAmount" README.md` returns matches
- [x] `grep "extreme edge case" CHOOSING-A-MONEY-LIBRARY.md` returns no matches

### Must Have
- All 6 audit items addressed
- Consistent documentation style (match existing format)
- Two separate commits with semantic messages

### Must NOT Have (Guardrails)
- NO changes to package.json, CHANGELOG, or version numbers
- NO reformatting of existing documentation sections
- NO new code examples (unless explicitly in a fix)
- NO changes to any .ts files except errors.ts and currency.ts
- NO JSDoc additions beyond the 5 specified utility functions
- NO touching test files

---

## Verification Strategy

### Test Decision
- **Automated tests**: None needed (documentation changes only)
- **Type check**: `npm run lint` must pass after changes

### Agent-Executed QA Scenarios (MANDATORY)

```
Scenario: Error message fix verified
  Tool: Bash
  Preconditions: lib/errors.ts exists
  Steps:
    1. grep -n "Money.registerCurrency" lib/errors.ts
    2. Assert: Exit code 1 (no matches - old message gone)
    3. grep -n "registerCurrency()" lib/errors.ts
    4. Assert: Exit code 0 and output contains "CurrencyUnknownError"
  Expected Result: Old message removed, new message present
  Evidence: grep output

Scenario: README decimal claim updated
  Tool: Bash
  Preconditions: README.md exists  
  Steps:
    1. grep -n "8+ decimal places" README.md
    2. Assert: Exit code 1 (old phrase removed)
    3. grep -n "arbitrary decimal" README.md
    4. Assert: Exit code 0 (new phrase present)
  Expected Result: Claim accurately reflects capability
  Evidence: grep output

Scenario: Comparison methods documented
  Tool: Bash
  Preconditions: README.md exists
  Steps:
    1. grep -n "greaterThanOrEqual" README.md
    2. Assert: Exit code 0 (method documented)
    3. grep -n "lessThanOrEqual" README.md
    4. Assert: Exit code 0 (method documented)
  Expected Result: Both methods appear in README
  Evidence: grep output showing line numbers

Scenario: Display Formatting section added
  Tool: Bash
  Preconditions: README.md exists
  Steps:
    1. grep -n "Display Formatting\|displayAmount" README.md
    2. Assert: Exit code 0 and multiple matches
    3. Assert: Output shows section header and property documentation
  Expected Result: New section with displayAmount explanation
  Evidence: grep output

Scenario: 18-decimal limitation removed
  Tool: Bash
  Preconditions: CHOOSING-A-MONEY-LIBRARY.md exists
  Steps:
    1. grep -n "extreme edge case" CHOOSING-A-MONEY-LIBRARY.md
    2. Assert: Exit code 1 (phrase removed)
    3. grep -n "18-decimal\|18 decimal" CHOOSING-A-MONEY-LIBRARY.md
    4. Assert: Exit code 1 (limitation row deleted)
  Expected Result: Outdated limitation claim no longer present
  Evidence: grep output

Scenario: Internal API documented with JSDoc
  Tool: Bash
  Preconditions: lib/currency.ts exists
  Steps:
    1. grep -B2 "export function clearCurrencies" lib/currency.ts
    2. Assert: Output contains "@internal"
    3. grep -B2 "export function getAllCurrencies" lib/currency.ts
    4. Assert: Output contains "@internal"
    5. Repeat for: loadCurrencyMap, hasCurrency, getCurrency
  Expected Result: All 5 functions have @internal JSDoc
  Evidence: grep output showing JSDoc comments

Scenario: No unintended file changes
  Tool: Bash
  Preconditions: Git working tree
  Steps:
    1. git diff --name-only
    2. Assert: Only shows: lib/errors.ts, lib/currency.ts, README.md, CHOOSING-A-MONEY-LIBRARY.md
  Expected Result: Exactly 4 files modified
  Evidence: git diff output

Scenario: Type safety preserved
  Tool: Bash
  Preconditions: TypeScript configured
  Steps:
    1. npm run lint
    2. Assert: Exit code 0
  Expected Result: No TypeScript errors
  Evidence: lint output

Scenario: All tests still pass
  Tool: Bash
  Preconditions: Test suite exists
  Steps:
    1. npm test
    2. Assert: Exit code 0
    3. Assert: Output contains "107" tests and "pass 107"
  Expected Result: No regressions
  Evidence: Test output summary
```

---

## Execution Strategy

### Sequential Execution (No Parallelization)

These edits are documentation-focused and logically grouped. Execute sequentially:

```
Task 1: Fix error message (HIGH - bug fix)
    ↓
[COMMIT 1: "fix: correct CurrencyUnknownError message"]
    ↓
Tasks 2-6: Documentation updates (can be batched)
    ↓
[COMMIT 2: "docs: update README and comparison doc per audit"]
```

### Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix: correct CurrencyUnknownError message referencing non-existent method` | lib/errors.ts | grep verification |
| 6 | `docs: update README and comparison doc per audit findings` | README.md, CHOOSING-A-MONEY-LIBRARY.md, lib/currency.ts | npm run lint && npm test |

---

## TODOs

- [x] 1. Fix CurrencyUnknownError message

  **What to do**:
  - In `lib/errors.ts` line 33, change:
    - FROM: `"register it first with Money.registerCurrency()"`
    - TO: `"register it first with registerCurrency()"`

  **Must NOT do**:
  - Change error class names or inheritance
  - Modify other error messages
  - Add new error types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line change in one file
  - **Skills**: `[]`
    - Reason: No special skills needed for simple text edit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential - must commit before docs
  - **Blocks**: Tasks 2-6 (commit boundary)
  - **Blocked By**: None

  **References**:
  - `lib/errors.ts:33` - Line containing the incorrect message
  - `lib/index.ts:35` - Shows `registerCurrency` is exported as standalone function

  **Acceptance Criteria**:
  - [ ] `grep "Money.registerCurrency" lib/errors.ts` returns exit code 1 (no matches)
  - [ ] `grep "registerCurrency()" lib/errors.ts` returns match on CurrencyUnknownError line
  - [ ] `npm run lint` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Error message corrected
    Tool: Bash
    Steps:
      1. grep -c "Money.registerCurrency" lib/errors.ts
      2. Assert: Output is "0"
      3. grep "Unknown currency.*registerCurrency()" lib/errors.ts
      4. Assert: Exit code 0, shows corrected message
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `fix: correct CurrencyUnknownError message referencing non-existent method`
  - Files: `lib/errors.ts`
  - Pre-commit: `npm run lint`

---

- [x] 2. Update README decimal places claim

  **What to do**:
  - Find line containing `"Cryptocurrency ready": Supports 8+ decimal places`
  - Change to: `"Cryptocurrency ready": Supports arbitrary decimal places (tested up to 30 for XNO/Nano)`

  **Must NOT do**:
  - Change any other feature bullet points
  - Add new examples
  - Modify surrounding text

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single phrase replacement
  - **Skills**: `[]`
    - Reason: Simple text edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-6)
  - **Blocks**: None
  - **Blocked By**: Task 1 commit

  **References**:
  - `README.md` - Search for exact text "8+ decimal places"
  - `test/money.test.ts:299-359` - Tests proving 18 and 30 decimal support

  **Acceptance Criteria**:
  - [ ] `grep "8+ decimal places" README.md` returns exit code 1
  - [ ] `grep "arbitrary decimal places" README.md` returns exit code 0

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Decimal claim updated
    Tool: Bash
    Steps:
      1. grep -c "8+ decimal places" README.md
      2. Assert: Output is "0"
      3. grep "arbitrary decimal places.*30" README.md
      4. Assert: Exit code 0
    Evidence: grep output
  ```

  **Commit**: NO (groups with Tasks 3-6)

---

- [x] 3. Add comparison methods to README

  **What to do**:
  - Find the Comparisons section in README (search for `### Comparisons` or `a.equalTo(b)`)
  - Add two new lines after the existing comparison methods:
    ```typescript
    a.greaterThanOrEqual(b) // true
    a.lessThanOrEqual(b)    // false
    ```
  - Match the exact format of existing methods (aligned comments)

  **Must NOT do**:
  - Reorganize existing comparison methods
  - Add extensive descriptions
  - Change the code example variables (a, b)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding two lines to existing section
  - **Skills**: `[]`
    - Reason: Simple documentation edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4-6)
  - **Blocks**: None
  - **Blocked By**: Task 1 commit

  **References**:
  - `README.md` - Search for "Comparisons" section header
  - `lib/money.ts:329-341` - Implementation of the two methods

  **Acceptance Criteria**:
  - [ ] `grep "greaterThanOrEqual" README.md` returns exit code 0
  - [ ] `grep "lessThanOrEqual" README.md` returns exit code 0
  - [ ] Methods appear in Comparisons section (verify context)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Comparison methods documented
    Tool: Bash
    Steps:
      1. grep -A2 "greaterThan(b)" README.md | grep -q "greaterThanOrEqual"
      2. Assert: Exit code 0 (methods are adjacent)
      3. grep "lessThanOrEqual" README.md
      4. Assert: Exit code 0
    Evidence: grep output showing both methods
  ```

  **Commit**: NO (groups with Tasks 2, 4-6)

---

- [x] 4. Add Display Formatting subsection to README

  **What to do**:
  - Add a new subsection after "Why String Amounts?" section (search for `## Why String Amounts?`)
  - New section content:
    ```markdown
    ## Display Formatting
    
    The `displayAmount` property provides a display-friendly version of the amount:
    
    ```typescript
    const money = new Money('USD', '100.00')
    money.amount        // "100.00" (full precision, use for storage/calculations)
    money.displayAmount // "100.00" (formatted for display, used by toString())
    ```
    
    For most currencies, `amount` and `displayAmount` are identical. They differ when:
    - Custom `displayDecimals` is set via `registerCurrency()`
    - Trailing zeros are trimmed for cleaner display
    
    Use `amount` for data storage and precision-critical operations. Use `displayAmount` (or `toString()`) for user-facing output.
    ```

  **Must NOT do**:
  - Move existing sections
  - Add locale formatting (explicitly out of scope per Design Philosophy)
  - Change the "Why String Amounts?" section itself

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding one focused section
  - **Skills**: `[]`
    - Reason: Documentation only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-3, 5-6)
  - **Blocks**: None
  - **Blocked By**: Task 1 commit

  **References**:
  - `README.md` - Search for "Why String Amounts?" to find insertion point
  - `lib/money.ts:41,68,380` - displayAmount definition and usage
  - `lib/currency.ts:9` - displayDecimals in CurrencyDefinition

  **Acceptance Criteria**:
  - [ ] `grep "## Display Formatting" README.md` returns exit code 0
  - [ ] `grep "displayAmount" README.md` returns multiple matches
  - [ ] Section appears after "Why String Amounts?"

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Display Formatting section added
    Tool: Bash
    Steps:
      1. grep -n "## Display Formatting" README.md
      2. Assert: Exit code 0
      3. grep -A5 "displayAmount" README.md | head -10
      4. Assert: Shows explanation of property
    Evidence: Section content visible in grep output
  ```

  **Commit**: NO (groups with Tasks 2-3, 5-6)

---

- [x] 5. Remove 18-decimal limitation from CHOOSING doc

  **What to do**:
  - In `CHOOSING-A-MONEY-LIBRARY.md`, find and DELETE the entire row:
    ```
    | 18-decimal precision | 8 decimals handles BTC; 18 is extreme edge case | Use decimal.js directly for ETH wei |
    ```
  - This is in the "What subunit-money Doesn't Do (By Design)" table

  **Must NOT do**:
  - Change other rows in the table
  - Add a replacement row
  - Modify table formatting

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single row deletion
  - **Skills**: `[]`
    - Reason: Simple edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-4, 6)
  - **Blocks**: None
  - **Blocked By**: Task 1 commit

  **References**:
  - `CHOOSING-A-MONEY-LIBRARY.md` - Search for "18-decimal precision"
  - `test/money.test.ts:315-338` - Proof that ETH (18 decimals) works fine

  **Acceptance Criteria**:
  - [ ] `grep "18-decimal" CHOOSING-A-MONEY-LIBRARY.md` returns exit code 1
  - [ ] `grep "extreme edge case" CHOOSING-A-MONEY-LIBRARY.md` returns exit code 1
  - [ ] Table structure remains valid (3 columns)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Outdated row removed
    Tool: Bash
    Steps:
      1. grep -c "18-decimal\|extreme edge case" CHOOSING-A-MONEY-LIBRARY.md
      2. Assert: Output is "0"
      3. grep -c "What subunit-money Doesn't Do" CHOOSING-A-MONEY-LIBRARY.md
      4. Assert: Output is "1" (section still exists)
    Evidence: grep counts
  ```

  **Commit**: NO (groups with Tasks 2-4, 6)

---

- [x] 6. Add @internal JSDoc to utility functions

  **What to do**:
  - In `lib/currency.ts`, add `@internal` JSDoc comment before each of these 5 functions:
    - `clearCurrencies()` (line ~60)
    - `getAllCurrencies()` (line ~43)
    - `loadCurrencyMap()` (line ~51)
    - `hasCurrency()` (line ~36)
    - `getCurrency()` (line ~29)
  
  - JSDoc format (minimal, consistent):
    ```typescript
    /**
     * @internal
     */
    export function clearCurrencies(): void {
    ```

  **Must NOT do**:
  - Add JSDoc to `registerCurrency()` (it's the public API, already documented in README)
  - Add descriptions beyond @internal tag
  - Change function signatures or implementations
  - Add JSDoc to types/interfaces

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding 5 small JSDoc blocks
  - **Skills**: `[]`
    - Reason: Simple documentation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-5)
  - **Blocks**: None
  - **Blocked By**: Task 1 commit

  **References**:
  - `lib/currency.ts` - All 5 functions are here
  - `lib/index.ts:34-42` - Shows these are exported (public surface but internal use)

  **Acceptance Criteria**:
  - [ ] `grep -B1 "export function clearCurrencies" lib/currency.ts` shows @internal
  - [ ] `grep -B1 "export function getAllCurrencies" lib/currency.ts` shows @internal
  - [ ] `grep -B1 "export function loadCurrencyMap" lib/currency.ts` shows @internal
  - [ ] `grep -B1 "export function hasCurrency" lib/currency.ts` shows @internal
  - [ ] `grep -B1 "export function getCurrency" lib/currency.ts` shows @internal
  - [ ] `npm run lint` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: All 5 functions have @internal
    Tool: Bash
    Steps:
      1. for fn in clearCurrencies getAllCurrencies loadCurrencyMap hasCurrency getCurrency; do
           grep -B2 "export function $fn" lib/currency.ts | grep -q "@internal" || exit 1
         done
      2. Assert: Exit code 0
    Evidence: Loop completes without error
  ```

  **Commit**: YES (final commit for docs batch)
  - Message: `docs: update README and comparison doc per audit findings`
  - Files: `README.md`, `CHOOSING-A-MONEY-LIBRARY.md`, `lib/currency.ts`
  - Pre-commit: `npm run lint && npm test`

---

## Success Criteria

### Final Verification Commands
```bash
# All acceptance criteria in one check
npm run lint && npm test && \
  ! grep -q "Money.registerCurrency" lib/errors.ts && \
  ! grep -q "8+ decimal places" README.md && \
  grep -q "greaterThanOrEqual" README.md && \
  grep -q "lessThanOrEqual" README.md && \
  grep -q "displayAmount" README.md && \
  grep -q "## Display Formatting" README.md && \
  ! grep -q "18-decimal precision" CHOOSING-A-MONEY-LIBRARY.md && \
  grep -q "@internal" lib/currency.ts && \
  echo "✅ All audit fixes verified"
```

### Final Checklist
- [x] Error message in CurrencyUnknownError corrected
- [x] README decimal claim updated to "arbitrary"
- [x] greaterThanOrEqual documented in README
- [x] lessThanOrEqual documented in README  
- [x] Display Formatting section added to README
- [x] 18-decimal limitation row removed from CHOOSING doc
- [x] 5 utility functions marked @internal
- [x] npm run lint passes
- [x] npm test passes (107 tests)
- [x] Exactly 2 commits created with semantic messages
- [x] Only 4 files modified: lib/errors.ts, lib/currency.ts, README.md, CHOOSING-A-MONEY-LIBRARY.md
