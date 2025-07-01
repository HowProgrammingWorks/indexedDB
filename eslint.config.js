'use strict';

const init = require('eslint-config-metarhia');

module.exports = init;
module.exports = [
  ...init,
  {
    files: ['Enterprise/**/*.js', 'Native/**/*.js', 'Pragmatic/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        indexedDB: true,
        prompt: true,
      },
    },
  },
];
