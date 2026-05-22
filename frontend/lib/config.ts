/** API მისამართი — ბრაუზერში იგივე hostname, რაც საიტის URL-ში (LAN-ისთვის). */
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

export { API_BASE, getApiBase };
