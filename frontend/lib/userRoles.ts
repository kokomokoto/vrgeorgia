export type UserRole = 'user' | 'agent' | 'admin' | 'agent_admin';

export const USER_ROLES: UserRole[] = ['user', 'agent', 'admin', 'agent_admin'];

export function isAgentRole(role?: string | null): boolean {
  return role === 'agent' || role === 'agent_admin';
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'agent_admin';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'მომხმარებელი',
  agent: 'აგენტი',
  admin: 'ადმინი',
  agent_admin: 'აგენტი-ადმინი',
};

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  user: 'bg-gray-100 text-gray-700',
  agent: 'bg-blue-100 text-blue-700',
  admin: 'bg-red-100 text-red-700',
  agent_admin: 'bg-purple-100 text-purple-700',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role;
}
