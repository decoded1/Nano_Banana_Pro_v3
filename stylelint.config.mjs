// stylelint.config.mjs - Stylelint Configuration
// Nano Banana Pro - Modern CSS and CSS Modules Support

/** @type {import('stylelint').Config} */
export default {
  // Base standards: CSS-in-JS friendly, modern CSS support
  extends: [
    'stylelint-config-standard',
    'stylelint-config-css-modules',
  ],

  rules: {
    // Allow CSS custom properties (variables) without validation
    'custom-property-pattern': null,

    // Disable strict selector patterns (conflicts with camelCase CSS Modules)
    'selector-class-pattern': null,

    // Enforce no redundant longhand properties
    'declaration-block-no-redundant-longhand-properties': true,

    // Allow both legacy (rgba) and modern (rgb) color functions
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,

    // Allow empty source files (placeholder CSS modules)
    'no-empty-source': null,

    // Import rules
    'import-notation': 'string',

    // Allow flexible font-family quoting
    'font-family-name-quotes': null,

    // Value rules
    'value-keyword-case': ['lower', {
      ignoreKeywords: ['currentColor'],
      ignoreProperties: ['font-family'],
    }],

    // At-rule rules
    'at-rule-no-unknown': [true, {
      ignoreAtRules: ['tailwind', 'apply', 'layer', 'config'],
    }],

    // Selector rules
    'selector-pseudo-class-no-unknown': [true, {
      ignorePseudoClasses: ['global', 'local'],
    }],
  },

  // Ignore patterns
  ignoreFiles: [
    'dist/**/*',
    'node_modules/**/*',
    '**/*.ts',
    '**/*.js',
    '**/*.html',
    '**/*.md',
    '**/*.json',
  ],
};
