import globals from 'globals';

// no-undef 중심 — 정의/임포트 안 된 식별자(런타임 블랭크 유발)를 빌드 전에 잡는다.
export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off',
    },
  },
];
