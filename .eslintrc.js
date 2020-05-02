module.exports = {
    env: {
        es6: true,
        node: true,
    },
    extends: ["eslint:recommended", "google"],
    parserOptions: {
        sourceType: "module",
    },
    rules: {
        "require-jsdoc": "off",
        "object-curly-spacing": ["error", "always"],
        "no-console": ["warn", { allow: ["warn", "error"] }],
        "quotes": ["error", "double", {avoidEscape: true, allowTemplateLiterals: true}],
    }
};
