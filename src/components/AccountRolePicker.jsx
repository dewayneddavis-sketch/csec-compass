import { ACCOUNT_ROLE_IDS, ACCOUNT_ROLE_LABELS, ACCOUNT_ROLE_QUESTION, ACCOUNT_ROLE_HINT, cleanAccountRole } from "../data/accountRoles";
import "./AccountRolePicker.css";

// The "I am a…" picker BOTH account-creation forms render (/signup and
// /auth/signup). One component so the two forms cannot drift — a role step that
// one form skipped would not be a required answer, exactly like the consent box
// beside it.
//
// The copy, the order and the ids all come from src/data/accountRoles.js; none
// of it is retyped here. tools/check-account-identity.mjs asserts both forms
// render THIS component and require an answer.
export default function AccountRolePicker({ value, onChange, name = "account-role", disabled = false }) {
  const selected = cleanAccountRole(value);
  return (
    <fieldset className="role-picker">
      <legend className="role-picker-question">{ACCOUNT_ROLE_QUESTION}</legend>
      <div className="role-picker-options">
        {ACCOUNT_ROLE_IDS.map((id) => (
          <label
            key={id}
            className={"role-picker-option" + (selected === id ? " role-picker-option-selected" : "")}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={selected === id}
              onChange={() => onChange(id)}
              disabled={disabled}
            />
            <span className="role-picker-label">{ACCOUNT_ROLE_LABELS[id]}</span>
          </label>
        ))}
      </div>
      <p className="role-picker-hint">{ACCOUNT_ROLE_HINT}</p>
    </fieldset>
  );
}
