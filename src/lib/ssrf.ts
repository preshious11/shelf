/**
 * Server-Side Request Forgery (SSRF) Guard
 * Validates outgoing URLs to ensure the server never makes requests
 * to local, private, link-local, loopback, or cloud metadata endpoints.
 */

// Hostnames explicitly reserved or dangerous for SSRF
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
  '0.0.0.0',
  '::',
  '::1',
  'loopback',
]);

const BLOCKED_EXTENSIONS = ['.local', '.internal', '.localhost', '.arpa'];

/**
 * Checks if an IPv4 string falls within private or reserved ranges
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b] = parts;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private network 172.16.0.0 – 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  // 198.18.0.0/15 (Network benchmark tests)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224) return true;

  return false;
}

/**
 * Validates whether a target URL is safe to fetch from a backend server.
 */
export function isSafePublicUrl(urlStr: string): { safe: boolean; reason?: string; url?: URL } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { safe: false, reason: 'Invalid URL structure' };
  }

  // Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Protocol must be http or https' };
  }

  // Disallow user credentials in URL (e.g. http://admin:pass@host)
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'Credentials in URL are disallowed' };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Disallow empty host
  if (!hostname) {
    return { safe: false, reason: 'Hostname is empty' };
  }

  // Disallow blocked known names
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: 'Target host is disallowed' };
  }

  for (const ext of BLOCKED_EXTENSIONS) {
    if (hostname.endsWith(ext)) {
      return { safe: false, reason: 'Target domain suffix is disallowed' };
    }
  }

  // Check for plain integers, octal, or hex formats (e.g. 2130706433 or 0x7f000001)
  if (/^(?:0x[0-9a-f]+|\d+)$/i.test(hostname)) {
    return { safe: false, reason: 'Numeric IP encoding is disallowed' };
  }

  // Check for standard IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    // Validate each octet <= 255 and no leading zeros (octal bypass protection)
    for (let i = 1; i <= 4; i++) {
      const part = ipMatch[i];
      if (part.length > 1 && part.startsWith('0')) {
        return { safe: false, reason: 'Octal IP representation disallowed' };
      }
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        return { safe: false, reason: 'Invalid IP octet' };
      }
    }

    if (isPrivateIPv4(hostname)) {
      return { safe: false, reason: 'Private/reserved IP address is disallowed' };
    }
  }

  // Check for IPv6 (e.g., [::1], [fe80::...])
  const strippedIpv6 = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (strippedIpv6.includes(':')) {
    const lower = strippedIpv6.toLowerCase();
    if (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80') ||
      lower.startsWith('::ffff:')
    ) {
      return { safe: false, reason: 'Private/loopback IPv6 is disallowed' };
    }
  }

  return { safe: true, url: parsed };
}

