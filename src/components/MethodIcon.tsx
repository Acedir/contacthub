import { AtSign, Mail, MapPin, Phone } from 'lucide-react'
import type { MethodKind } from '../types'

const ICONS = {
  phone: Phone,
  email: Mail,
  address: MapPin,
  social: AtSign,
} satisfies Record<MethodKind, typeof Phone>

export function MethodIcon({
  kind,
  size = 16,
  strokeWidth = 1.9,
}: {
  kind: MethodKind
  size?: number
  strokeWidth?: number
}) {
  const Icon = ICONS[kind]
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />
}
