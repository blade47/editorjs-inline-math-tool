/**
 * KaTeX Custom Macros Configuration
 *
 * These macros are synchronized with the backend LaTeX processor
 * (earendel-backend/.../LatexUtils.kt KATEX_NEW_COMMANDS)
 *
 * This ensures that LaTeX commands work identically in:
 * - Frontend preview (KaTeX)
 * - Generated PDF (XeLaTeX)
 *
 * ⚠️ IMPORTANT: Any changes to this file should be reflected in the backend
 * LatexUtils.kt and vice versa to maintain preview/PDF consistency.
 *
 * @see earendel-backend/aflsolutions-earendel-core/src/main/kotlin/it/aflsolutions/earendel/core/service/latex/LatexUtils.kt
 */

/**
 * Custom macro definitions for mathematical notation
 * These provide convenient shortcuts for commonly used symbols
 */
export const EARENDEL_KATEX_MACROS = {
  // Real numbers
  '\\R': '\\mathbb{R}',
  '\\Reals': '\\mathbb{R}',
  '\\reals': '\\mathbb{R}',

  // Natural numbers
  '\\N': '\\mathbb{N}',
  '\\natnums': '\\mathbb{N}',

  // Integers
  '\\Z': '\\mathbb{Z}',

  // Complex numbers
  '\\C': '\\mathbb{C}',
  '\\Complex': '\\mathbb{C}',
  '\\cnums': '\\mathbb{C}',

  // Mathematical functions and symbols
  '\\image': '\\Im', // Imaginary part
  '\\weierp': '\\wp', // Weierstrass p
  '\\alef': '\\aleph', // Aleph (cardinality)
  '\\alefsym': '\\aleph',

  // Uppercase Greek letters (not defined in standard LaTeX)
  // LaTeX only defines lowercase Greek; uppercase are Roman letters
  '\\Alpha': 'A',
  '\\Beta': 'B',
  '\\Epsilon': 'E',
  '\\Zeta': 'Z',
  '\\Eta': 'H',
  '\\Iota': 'I',
  '\\Kappa': 'K',
  '\\Mu': 'M',
  '\\Nu': 'N',
  '\\Omicron': 'O',
  '\\Rho': 'P',
  '\\Tau': 'T',
  '\\Chi': 'X',
};

/**
 * Default KaTeX options with custom macros
 * Use this for inline math rendering (matches backend inline mode)
 */
export const KATEX_INLINE_OPTIONS = {
  throwOnError: false, // Don't crash on LaTeX errors, show error message
  displayMode: false, // Use inline mode (matches backend $...$ format)
  macros: EARENDEL_KATEX_MACROS,
  trust: false, // Don't allow \href or other potentially unsafe commands
  strict: 'warn', // Warn about non-standard LaTeX, don't error
};
