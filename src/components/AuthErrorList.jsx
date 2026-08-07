/**
 * Shows one or more auth form errors in a single alert.
 */
export default function AuthErrorList({ errors, className = "auth-alert auth-alert--error" }) {
  const list = Array.isArray(errors) ? errors.filter((e) => String(e ?? "").trim()) : [];
  if (list.length === 0) return null;

  if (list.length === 1) {
    return (
      <div className={className} role="alert">
        {list[0]}
      </div>
    );
  }

  return (
    <div className={className} role="alert">
      <p className="auth-alert-list-title">Please fix the following:</p>
      <ul className="auth-alert-list">
        {list.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}
