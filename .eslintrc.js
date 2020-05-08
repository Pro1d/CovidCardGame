module.exports = {
    env: {
        es6: true,
        node: true,
    },
    extends: ["eslint:recommended", "google"],
    parserOptions: {
        sourceType: "module",
        ecmaVersion: 9
    },
    rules: {
        "max-len": ["error", {"code": 100}],
        "require-jsdoc": "off",
        "object-curly-spacing": ["error", "always"],
        "no-console": ["warn", { allow: ["warn", "error", "info"] }],
        "quotes": ["error", "double", {avoidEscape: true, allowTemplateLiterals: true}],
        "brace-style": ["error", "1tbs", {allowSingleLine: true}],
        "camelcase": ["error", {allow: ["^server_"]}],
        "comma-dangle": ["error", {
            "arrays": "always-multiline",
            "objects": "always-multiline",
            "imports": "always-multiline",
            "exports": "always-multiline",
            "functions": "never"
        }],
        "space-before-function-paren": ["error", {anonymous: "always", named: "never"}],
        "prefer-spread": "off",
    }
};
