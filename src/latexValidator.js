/**
 * LaTeX Validation Utilities
 *
 * Validates LaTeX syntax before PDF generation to catch common errors early.
 * Prevents cryptic XeLaTeX compilation errors by validating in the frontend.
 */

/**
 * Validates LaTeX code for common syntax errors
 *
 * @param {string} latexCode - LaTeX code to validate
 * @returns {ValidationResult} - Object containing isValid flag and array of error messages
 *
 * @example
 * const result = validateLaTeX('\\frac{1}{2');
 * if (!result.isValid) {
 *   console.log(result.errors); // ['Unclosed braces detected']
 * }
 */
export function validateLaTeX(latexCode) {
  const errors = [];
  const warnings = [];

  if (!latexCode || latexCode.trim().length === 0) {
    return { isValid: false, errors: ['LaTeX code is empty'], warnings: [] };
  }

  // Check 1: Balanced braces
  const braceErrors = checkBalancedBraces(latexCode);
  if (braceErrors.length > 0) {
    errors.push(...braceErrors);
  }

  // Check 2: Balanced brackets
  const bracketErrors = checkBalancedBrackets(latexCode);
  if (bracketErrors.length > 0) {
    errors.push(...bracketErrors);
  }

  // Check 3: Incomplete commands
  const incompletePattern = /\\[a-zA-Z]+\s*$/;
  if (incompletePattern.test(latexCode.trim())) {
    warnings.push('LaTeX command appears incomplete at end');
  }

  // Check 4: Common typos in environment names
  const environmentErrors = checkEnvironments(latexCode);
  if (environmentErrors.length > 0) {
    errors.push(...environmentErrors);
  }

  // Check 5: Unsupported commands (work in KaTeX but not XeLaTeX)
  const unsupportedCommands = checkUnsupportedCommands(latexCode);
  if (unsupportedCommands.length > 0) {
    warnings.push(...unsupportedCommands);
  }

  // Check 6: Unescaped special characters in text mode
  const specialCharErrors = checkUnescapedSpecialChars(latexCode);
  if (specialCharErrors.length > 0) {
    warnings.push(...specialCharErrors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks for balanced braces { }
 */
function checkBalancedBraces(latexCode) {
  const errors = [];
  let braceCount = 0;
  let inCommand = false;

  for (let i = 0; i < latexCode.length; i++) {
    const char = latexCode[i];
    const prevChar = i > 0 ? latexCode[i - 1] : '';

    // Skip escaped braces
    if (char === '{' && prevChar !== '\\') {
      braceCount++;
      inCommand = false;
    } else if (char === '}' && prevChar !== '\\') {
      braceCount--;
      if (braceCount < 0) {
        errors.push(`Unmatched closing brace '}' at position ${i + 1}`);
        break;
      }
    } else if (char === '\\') {
      inCommand = true;
    }
  }

  if (braceCount > 0) {
    errors.push(`${braceCount} unclosed brace(s) '{'`);
  }

  return errors;
}

/**
 * Checks for balanced brackets [ ]
 */
function checkBalancedBrackets(latexCode) {
  const errors = [];
  let bracketCount = 0;

  for (let i = 0; i < latexCode.length; i++) {
    const char = latexCode[i];
    const prevChar = i > 0 ? latexCode[i - 1] : '';

    // Skip escaped brackets
    if (char === '[' && prevChar !== '\\') {
      bracketCount++;
    } else if (char === ']' && prevChar !== '\\') {
      bracketCount--;
      if (bracketCount < 0) {
        errors.push(`Unmatched closing bracket ']' at position ${i + 1}`);
        break;
      }
    }
  }

  if (bracketCount > 0) {
    errors.push(`${bracketCount} unclosed bracket(s) '['`);
  }

  return errors;
}

/**
 * Checks for matching \begin{} and \end{} pairs
 */
function checkEnvironments(latexCode) {
  const errors = [];
  const beginMatches = [...latexCode.matchAll(/\\begin\{([^}]+)\}/g)];
  const endMatches = [...latexCode.matchAll(/\\end\{([^}]+)\}/g)];

  // Create a stack to track environment nesting
  const envStack = [];

  // Combine and sort all environment commands by position
  const allEnvs = [
    ...beginMatches.map((m) => ({ type: 'begin', name: m[1], pos: m.index })),
    ...endMatches.map((m) => ({ type: 'end', name: m[1], pos: m.index })),
  ].sort((a, b) => a.pos - b.pos);

  for (const env of allEnvs) {
    if (env.type === 'begin') {
      envStack.push(env.name);
    } else {
      // type === 'end'
      if (envStack.length === 0) {
        errors.push(`\\end{${env.name}} has no matching \\begin{${env.name}}`);
      } else {
        const lastBegin = envStack.pop();
        if (lastBegin !== env.name) {
          errors.push(`Environment mismatch: \\begin{${lastBegin}} closed with \\end{${env.name}}`);
        }
      }
    }
  }

  // Check for unclosed environments
  if (envStack.length > 0) {
    envStack.forEach((envName) => {
      errors.push(`Unclosed environment: \\begin{${envName}} has no matching \\end{${envName}}`);
    });
  }

  return errors;
}

/**
 * Checks for commands that work in KaTeX but not XeLaTeX
 */
function checkUnsupportedCommands(latexCode) {
  const warnings = [];

  // Commands that are KaTeX-specific
  const katexOnlyCommands = [
    { cmd: '\\htmlClass', msg: 'HTML-specific command, not supported in PDF generation' },
    { cmd: '\\htmlId', msg: 'HTML-specific command, not supported in PDF generation' },
    { cmd: '\\htmlStyle', msg: 'HTML-specific command, not supported in PDF generation' },
    { cmd: '\\htmlData', msg: 'HTML-specific command, not supported in PDF generation' },
  ];

  katexOnlyCommands.forEach(({ cmd, msg }) => {
    if (latexCode.includes(cmd)) {
      warnings.push(`${cmd}: ${msg}`);
    }
  });

  return warnings;
}

/**
 * Checks for common unescaped special characters
 */
function checkUnescapedSpecialChars(latexCode) {
  const warnings = [];

  // Check for standalone $ signs (should be \$ in text mode)
  // But don't warn if it's inside math mode
  const dollarPattern = /(?<!\\)\$(?![^$]*\$)/g;
  if (dollarPattern.test(latexCode)) {
    warnings.push('Found unescaped $ sign. Use \\$ in text or wrap in $ $ for math mode');
  }

  // Check for & outside of tabular environments (common copy-paste error)
  if (latexCode.includes('&') && !latexCode.includes('\\begin{tabular}')) {
    warnings.push('Found & character. Use \\& to display ampersand in text');
  }

  return warnings;
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
    lines.push('❌ Errors that must be fixed:');
    result.errors.forEach((error, index) => {
      lines.push(`  ${index + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push(''); // Empty line separator
    lines.push('⚠️  Warnings:');
    result.warnings.forEach((warning, index) => {
      lines.push(`  ${index + 1}. ${warning}`);
    });
  }

  return lines.join('\n');
}
