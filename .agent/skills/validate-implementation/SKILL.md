---
name: validate-implementation
description: This skill validates new implementations for backward compatibility using regression tests.
---

# Code Review & Validation Skill

This skill ensures that any new implementation does not break existing functionality and maintains backward compatibility, supported by regression testing (`regression-test.ts`).

## Review Checklist

1. **Correctness**
   - Verify that the implementation meets the intended requirements.
   - Ensure logic is accurate and produces expected results.

2. **Backward Compatibility**
   - Confirm that existing features and workflows remain unaffected.
   - Validate changes against `regression-test.ts`.

3. **Edge Cases**
   - Check handling of invalid inputs, null/undefined values, and failure scenarios.
   - Ensure proper error handling and fallback mechanisms.

4. **Style & Consistency**
   - Follow project coding standards and naming conventions.
   - Maintain readability and proper structure.

5. **Performance**
   - Identify any unnecessary computations or inefficiencies.
   - Ensure scalability where applicable.

## Feedback Guidelines

- Be specific about what needs to change.
- Clearly explain the reasoning behind each suggestion.
- Provide actionable recommendations or alternative approaches where possible.
- Highlight potential risks or regressions.

## Validation Requirement

- All changes must pass existing tests and `@/scripts/regression-test.ts` before approval.