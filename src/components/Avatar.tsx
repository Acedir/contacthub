import type { CSSProperties } from 'react'
import { avatarPalette, getInitials } from '../lib/contacts'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const palette = avatarPalette(name)
  const style = {
    '--avatar-from': palette.from,
    '--avatar-to': palette.to,
  } as CSSProperties

  return (
    <span
      className={`avatar avatar-${size} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}
