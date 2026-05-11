interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export default function Switch({ checked, onChange, disabled }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 rounded-full border transition-colors ${
        checked ? 'border-accent/70 bg-accent' : 'border-white/10 bg-white/12'
      } disabled:opacity-40`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
