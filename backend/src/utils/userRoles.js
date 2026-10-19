/** მომხმარებლის როლები */
export const USER_ROLES = ['user', 'agent', 'admin', 'agent_admin', 'searcher'];

export function isAgentRole(role) {
  return role === 'agent' || role === 'agent_admin';
}

export function isAdminRole(role) {
  return role === 'admin' || role === 'agent_admin';
}

export function isSearcherRole(role) {
  return role === 'searcher';
}

export const ROLE_LABELS_KA = {
  user: 'მომხმარებელი',
  agent: 'აგენტი',
  admin: 'ადმინი',
  agent_admin: 'აგენტი-ადმინი',
  searcher: 'მაძებარი',
};
