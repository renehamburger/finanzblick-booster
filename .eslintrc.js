module.exports = {
  extends: ['airbnb-typescript/base'],
  rules: {
    'comma-dangle': [2, 'never'],
    'linebreak-style': 0,
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'LabeledStatement',
      'WithStatement'
    ]
  }
};
