import AnimatedBackground from './AnimatedBackground'
import { BackgroundId } from '../lib/backgrounds'

interface Props {
  mode: BackgroundId
  wallpaper: string | null
}

export default function BackgroundLayer({ mode, wallpaper }: Props) {
  if (mode === 'custom' && wallpaper) {
    return (
      <>
        <div
          className="bg-wallpaper"
          style={{ backgroundImage: `url(${wallpaper})` }}
          aria-hidden="true"
        />
        <div className="bg-wallpaper-veil" aria-hidden="true" />
      </>
    )
  }
  return <AnimatedBackground mode={mode} />
}
