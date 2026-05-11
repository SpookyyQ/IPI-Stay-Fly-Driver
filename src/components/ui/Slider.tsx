interface Props {
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}

export default function Slider({ min, max, step = 1, value, onChange, disabled }: Props) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/15 accent-accent
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_18px_rgba(242,182,93,.75)] disabled:opacity-40"
    />
  )
}
