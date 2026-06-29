import AnimatedBackground from './AnimatedBackground'
import { BackgroundId, resolveWallpaper } from '../lib/backgrounds'

interface Props {
  mode: BackgroundId
  wallpaper: string | null
}

/**
 * Layered backdrop: the wallpaper (custom upload or bundled default) sits at the
 * base, a darkening veil keeps content readable, and the optional animation
 * renders on top of both.
 */
export default function BackgroundLayer({ mode, wallpaper }: Props) {
  return (
    <>
      <div
        className="bg-wallpaper"
        style={{ backgroundImage: `url(${resolveWallpaper(wallpaper)})` }}
        aria-hidden="true"
      />
      <div className="bg-wallpaper-veil" aria-hidden="true" />
      <AnimatedBackground mode={mode} />
    </>
  )
}
