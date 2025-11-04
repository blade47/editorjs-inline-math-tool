/**
 * LaTeX Validation Utilities
 *
 * Uses KaTeX to validate LaTeX syntax by attempting to render.
 * This ensures validation matches what will actually render/fail.
 */

import katex from 'katex';

/**
 * Validates LaTeX code using KaTeX rendering
 *
 * @param {string} latexCode - LaTeX code to validate
 * @returns {ValidationResult} - Object containing isValid flag and array of error messages
 *
 * @example
 * const result = validateLaTeX('\\frac{1}{2');
 * if (!result.isValid) {
 *   console.log(result.errors); // ['KaTeX parse error: ...']
 * }
 */
export function validateLaTeX(latexCode) {
  const errors = [];
  const warnings = [];

  // Empty LaTeX is valid - allow users to clear or start fresh
  if (!latexCode || latexCode.trim().length === 0) {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Try to render with KaTeX to validate
  try {
    // Render in a throwaway element to test validity
    katex.renderToString(latexCode, {
      throwOnError: true,
      displayMode: false,
      strict: 'warn',
    });

    // If we get here, it's valid
    return { isValid: true, errors: [], warnings: [] };
  } catch (error) {
    // Extract user-friendly error message
    let errorMessage = error.message || 'Invalid LaTeX syntax';

    // Clean up KaTeX error messages for better UX
    errorMessage = errorMessage
      .replace(/^KaTeX parse error: /, '')
      .replace(/at position \d+: /, '')
      .trim();

    errors.push(errorMessage);

    return {
      isValid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Formats validation results into a user-friendly message
 *
 * @param {ValidationResult} result - Validation result from validateLaTeX
 * @returns {string} - Formatted message for display
 */
export function formatValidationMessage(result) {
  const lines = [];

  if (result.errors.length > 0) {
    lines.push('❌ Errors:');
    result.errors.forEach((error, index) => {
      lines.push(`  ${index + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('⚠️  Warnings:');
    result.warnings.forEach((warning, index) => {
      lines.push(`  ${index + 1}. ${warning}`);
    });
  }

  return lines.join('\n');
}
