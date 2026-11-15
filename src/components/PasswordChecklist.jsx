import { PASSWORD_RULES } from '../lib/password.js';

/** Live checklist shown under password fields. Renders a check for every met requirement. */
export default function PasswordChecklist({ password }) {
  return (
    <ul className="password-checklist" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className={ok ? 'ok' : ''}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span> {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
