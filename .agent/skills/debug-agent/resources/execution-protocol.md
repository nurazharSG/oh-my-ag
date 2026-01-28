# Debug Agent - Execution Protocol

Follow these 4 steps in order for every bug.

## Step 1: Understand
- Gather: What happened? What was expected? Error messages? Steps to reproduce?
- Read relevant code using Serena:
  - `find_symbol("functionName")`: Locate the failing function
  - `find_referencing_symbols("Component")`: Find all callers
  - `search_for_pattern("error pattern")`: Find similar issues
- Classify: logic bug, runtime error, performance issue, security flaw, or integration failure

## Step 2: Reproduce & Diagnose
- Trace execution flow from entry point to failure
- Identify the exact line and condition that causes the bug
- Determine root cause (not just symptom):
  - Null/undefined access?
  - Race condition?
  - Missing validation?
  - Wrong assumption about data shape?
- Check `resources/common-patterns.md` for known patterns

## Step 3: Fix & Test
- Apply minimal fix that addresses the root cause
- Write a regression test that:
  - Fails without the fix
  - Passes with the fix
  - Covers the specific edge case
- Check for similar patterns elsewhere: `search_for_pattern("same_bug_pattern")`
- If found, fix proactively or report them

## Step 4: Document & Verify
- Run `resources/checklist.md` items
- Save bug report to `.gemini/antigravity/brain/bugs/` using `resources/bug-report-template.md`
- Include: root cause, fix, prevention advice
- Verify no regressions in related functionality
