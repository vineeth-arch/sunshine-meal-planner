import type { ProfileKey } from '../../types/domain'

export type ProfileOption = {
  key: ProfileKey
  label: string
  badge: string
  description: string
  helper: string
  email: string
}

export const PROFILE_OPTIONS: ProfileOption[] = [
  {
    key: 'admin',
    label: 'Admin',
    badge: 'House lead',
    description: 'Manage the household setup and keep the kitchen hub in sync.',
    helper: 'Use the Admin profile password from Firebase Authentication.',
    email: 'admin@moms-kitchen.local',
  },
  {
    key: 'mom',
    label: 'Mom',
    badge: 'Daily planner',
    description: 'Jump into meal planning and pantry updates with Mom’s profile.',
    helper: 'Use the Mom profile password from Firebase Authentication.',
    email: 'mom@moms-kitchen.local',
  },
  {
    key: 'dad',
    label: 'Dad',
    badge: 'Kitchen helper',
    description: 'Open the family dashboard quickly for planning and check-ins.',
    helper: 'Use the Dad profile password from Firebase Authentication.',
    email: 'dad@moms-kitchen.local',
  },
  {
    key: 'guest',
    label: 'Guest',
    badge: 'View only',
    description: 'Share a simple entry point for visitors or temporary access.',
    helper: 'Use the Guest profile password from Firebase Authentication.',
    email: 'guest@moms-kitchen.local',
  },
]

const profileByEmail = new Map(PROFILE_OPTIONS.map((option) => [option.email, option]))

export function getProfileOption(key: ProfileKey | null) {
  if (!key) return null
  return PROFILE_OPTIONS.find((option) => option.key === key) ?? null
}

export function getProfileLabelFromEmail(email: string | null | undefined) {
  if (!email) return null
  return profileByEmail.get(email)?.label ?? null
}
