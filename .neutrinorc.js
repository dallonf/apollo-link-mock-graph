const library = require("@neutrinojs/library");
const jest = require("@neutrinojs/jest");
const eslint = require("@neutrinojs/eslint");

var restrictedGlobals = require("confusing-browser-globals");

module.exports = {
  use: [
    eslint({
      test: /\.(js|jsx)$/,
      include: [],
      exclude: [],
      eslint: {
        parser: "babel-eslint",
        plugins: ["import", "jest"],
        envs: ["browser", "commonjs", "es6", "jest", "node"],
        parserOptions: {
          ecmaVersion: 2018,
          sourceType: "module",
        },
        rules: {
          // http://eslint.org/docs/rules/
          "array-callback-return": "warn",
          "default-case": ["warn", { commentPattern: "^no default$" }],
          "dot-location": ["warn", "property"],
          eqeqeq: ["warn", "smart"],
          "new-parens": "warn",
          "no-array-constructor": "warn",
          "no-caller": "warn",
          "no-cond-assign": ["error", "except-parens"],
          "no-const-assign": "error",
          "no-control-regex": "warn",
          "no-delete-var": "warn",
          "no-dupe-args": "error",
          "no-dupe-class-members": "warn",
          "no-dupe-keys": "error",
          "no-duplicate-case": "error",
          "no-empty-character-class": "warn",
          "no-empty-pattern": "warn",
          "no-eval": "error",
          "no-ex-assign": "warn",
          "no-extend-native": "warn",
          "no-extra-bind": "warn",
          "no-extra-label": "warn",
          "no-fallthrough": "warn",
          "no-func-assign": "warn",
          "no-implied-eval": "warn",
          "no-invalid-regexp": "error",
          "no-iterator": "warn",
          "no-label-var": "warn",
          "no-labels": ["warn", { allowLoop: true, allowSwitch: false }],
          "no-lone-blocks": "warn",
          "no-loop-func": "warn",
          "no-mixed-operators": [
            "warn",
            {
              groups: [
                ["&", "|", "^", "~", "<<", ">>", ">>>"],
                ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
                ["&&", "||"],
                ["in", "instanceof"],
              ],
              allowSamePrecedence: false,
            },
          ],
          "no-multi-str": "warn",
          "no-native-reassign": "warn",
          "no-negated-in-lhs": "warn",
          "no-new-func": "warn",
          "no-new-object": "warn",
          "no-new-symbol": "warn",
          "no-new-wrappers": "warn",
          "no-obj-calls": "warn",
          "no-octal": "warn",
          "no-octal-escape": "warn",
          "no-redeclare": "warn",
          "no-regex-spaces": "warn",
          "no-restricted-syntax": ["warn", "WithStatement"],
          "no-script-url": "warn",
          "no-self-assign": "warn",
          "no-self-compare": "warn",
          "no-sequences": "warn",
          "no-shadow-restricted-names": "warn",
          "no-sparse-arrays": "warn",
          "no-template-curly-in-string": "warn",
          "no-this-before-super": "warn",
          "no-throw-literal": "warn",
          "no-undef": "error",
          "no-restricted-globals": ["error"].concat(restrictedGlobals),
          "no-unexpected-multiline": "warn",
          "no-unreachable": "warn",
          "no-unused-expressions": [
            "error",
            {
              allowShortCircuit: true,
              allowTernary: true,
              allowTaggedTemplates: true,
            },
          ],
          "no-unused-labels": "warn",
          "no-unused-vars": [
            "warn",
            {
              args: "none",
              ignoreRestSiblings: true,
            },
          ],
          "no-use-before-define": [
            "error",
            {
              functions: false,
              classes: false,
              variables: false,
            },
          ],
          "no-useless-computed-key": "warn",
          "no-useless-concat": "warn",
          "no-useless-escape": "warn",
          "no-useless-rename": [
            "warn",
            {
              ignoreDestructuring: false,
              ignoreImport: false,
              ignoreExport: false,
            },
          ],
          "no-with": "warn",
          "no-whitespace-before-property": "warn",
          "require-yield": "warn",
          "rest-spread-spacing": ["warn", "never"],
          strict: ["warn", "never"],
          "unicode-bom": ["warn", "never"],
          "use-isnan": "warn",
          "valid-typeof": "warn",
          "getter-return": "warn",

          // https://github.com/benmosher/eslint-plugin-import/tree/master/docs/rules
          "import/first": "error",
          "import/no-amd": "error",
          "import/no-webpack-loader-syntax": "error",

          // https://github.com/facebook/jest/tree/master/packages/eslint-plugin-jest
          "jest/no-disabled-tests": "warn",
          "jest/no-focused-tests": "error",
          "jest/no-identical-title": "error",
          "jest/valid-expect": "error",
        },
      },
    }),
    library({
      name: "apollo-link-mock-graph",
    }),
    jest({
      setupFiles: ["<rootDir>/test/setupTests.js"],
    }),
  ],
};
