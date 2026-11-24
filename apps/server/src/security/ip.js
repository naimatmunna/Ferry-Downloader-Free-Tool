/**
 * IP address classification for SSRF defence.
 *
 * Only globally routable unicast addresses are allowed. IPv4-mapped IPv6 is
 * unwrapped; IPv6 must be inside 2000::/3 and outside every special-purpose
 * block that can embed or reach IPv4 (NAT64, 6to4, Teredo) or is reserved.
 */
import ipaddr from 'ipaddr.js';

const V4_DENY = [
  '0.0.0.0/8', // "this network"
  '10.0.0.0/8', // private
  '100.64.0.0/10', // carrier-grade NAT
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local (cloud metadata lives here)
  '172.16.0.0/12', // private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // TEST-NET-1
  '192.31.196.0/24', // AS112
  '192.52.193.0/24', // AMT
  '192.88.99.0/24', // deprecated 6to4 relay
  '192.168.0.0/16', // private
  '192.175.48.0/24', // AS112 direct delegation
  '198.18.0.0/15', // benchmarking
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24', // TEST-NET-3
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved + broadcast
].map((c) => ipaddr.parseCIDR(c));

const V6_GLOBAL_UNICAST = ipaddr.parseCIDR('2000::/3');
const V6_DENY = [
  '2001::/23', // IETF protocol assignments (incl. Teredo 2001::/32, ORCHID, benchmarking)
  '2001:db8::/32', // documentation
  '2002::/16', // 6to4 (embeds IPv4)
  '3fff::/20', // documentation (RFC 9637)
  '5f00::/16', // SRv6 SIDs
].map((c) => ipaddr.parseCIDR(c));

/**
 * @param {string} address
 * @returns {{ public: boolean, kind: string, normalized: string|null }}
 */
export function classifyIp(address) {
  let raw = String(address ?? '').trim();
  if (raw.startsWith('[') && raw.endsWith(']')) raw = raw.slice(1, -1);
  if (raw.includes('%')) return { public: false, kind: 'zoned', normalized: null }; // fe80::1%eth0
  if (!ipaddr.isValid(raw)) return { public: false, kind: 'invalid', normalized: null };
  // ipaddr.isValid accepts legacy IPv4 forms ("127.1", "0x7f.1"); only accept canonical dotted quads
  // or IPv6. Hostnames have already been canonicalized by the WHATWG URL parser at this point.
  let addr = ipaddr.parse(raw);
  if (addr.kind() === 'ipv4' && !ipaddr.IPv4.isValidFourPartDecimal(raw)) {
    return { public: false, kind: 'non-canonical-ipv4', normalized: addr.toString() };
  }
  if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) addr = addr.toIPv4Address();

  if (addr.kind() === 'ipv4') {
    for (const [net, bits] of V4_DENY) if (addr.match(net, bits)) return { public: false, kind: addr.range(), normalized: addr.toString() };
    return { public: true, kind: 'unicast', normalized: addr.toString() };
  }
  // IPv6
  if (!addr.match(...V6_GLOBAL_UNICAST)) return { public: false, kind: addr.range(), normalized: addr.toNormalizedString() };
  for (const [net, bits] of V6_DENY) if (addr.match(net, bits)) return { public: false, kind: addr.range(), normalized: addr.toNormalizedString() };
  return { public: true, kind: 'unicast', normalized: addr.toNormalizedString() };
}

export function isPublicIp(address) {
  return classifyIp(address).public;
}

/** True if the string is an IP literal (v4 dotted quad or v6, optionally bracketed). */
export function isIpLiteral(host) {
  let h = String(host ?? '');
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  return ipaddr.IPv4.isValidFourPartDecimal(h) || ipaddr.IPv6.isValid(h);
}
