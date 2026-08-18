export type UserRoleRecord = {
  name?: unknown
  isAdmin?: unknown
}

/**
 * Keep legacy installations usable while making the role independent from the
 * username. The fallback is only for old records that have no role field.
 */
export const getUserIsAdmin = (user: UserRoleRecord): boolean => {
  if (typeof user.isAdmin === 'boolean') return user.isAdmin
  return String(user.name || '').trim().toLowerCase() === 'admin'
}

export const withUserRole = <T extends UserRoleRecord>(user: T): T & { isAdmin: boolean } => ({
  ...user,
  isAdmin: getUserIsAdmin(user),
})
