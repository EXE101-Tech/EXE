// Shared "community guidelines" consent. Shown on both login and register because a first Google
// sign-in creates the account, and the server asks for this consent before creating it.
export default function TermsCheckbox({ checked, onChange, error, className = '' }) {
  return <div className={className}>
    <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-slate-500 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-[var(--brand-primary)]"
        aria-describedby={error ? 'terms-error' : undefined}
      />
      <span>Tôi đồng ý tuân thủ quy tắc cộng đồng SportGo và đã đọc chính sách quyền riêng tư.</span>
    </label>
    {error && <p id="terms-error" role="alert" className="mt-1 pl-6 text-[10px] font-medium text-red-300">{error}</p>}
  </div>;
}
