// Shared password policy. Mirrors the backend rule (eco_password_policy_error):
// at least 8 characters, an uppercase letter, a lowercase letter and a special character.
export const PASSWORD_RULES = [
  { key: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { key: 'special', label: 'One special character (e.g. $, #, !)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordIssues(password) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
}

export const isPasswordStrong = (password) => passwordIssues(password).length === 0;
