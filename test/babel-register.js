// eslint-disable-next-line no-undef
require("@babel/register")({
  extensions: ['.ts'],
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: [
    "@babel/plugin-transform-runtime",
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-numeric-separator",
    "@babel/plugin-proposal-object-rest-spread"
  ]
});
