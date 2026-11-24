/**
 * Policy classes and resolution.
 *
 * A platform's registry entry carries a default category (1–5) and policy.
 * Operators can override per platform (or globally with `*`) at runtime.
 * Resolution never lets a global override *relax* a platform's policy.
 */

export const POLICY = Object.freeze({
  ALLOWED: 'allowed',
  ATTESTATION: 'attestation',
  EXPORT_ONLY: 'export_only',
  BLOCKED: 'blocked',
  DISABLED: 'disabled',
});

export const POLICIES = Object.freeze(Object.values(POLICY));

/** Higher = more restrictive. */
const RESTRICTIVENESS = Object.freeze({ allowed: 0, attestation: 1, export_only: 2, blocked: 3, disabled: 4 });

export const CATEGORIES = Object.freeze({
  1: Object.freeze({ id: 1, key: 'official', label: 'Officially supported downloads', defaultPolicy: 'allowed' }),
  2: Object.freeze({ id: 2, key: 'user-export', label: 'Authorized user-owned content exports', defaultPolicy: 'export_only' }),
  3: Object.freeze({ id: 3, key: 'public-permitted', label: 'Public media with permitted downloading', defaultPolicy: 'allowed' }),
  4: Object.freeze({ id: 4, key: 'restricted', label: 'Technically supported, permission-restricted', defaultPolicy: 'attestation' }),
  5: Object.freeze({ id: 5, key: 'protected', label: 'Unsupported or protected', defaultPolicy: 'blocked' }),
});

/** Short user-facing labels for policy badges. */
export const POLICY_LABELS = Object.freeze({
  allowed: 'Downloads allowed',
  attestation: 'Your own or licensed content only',
  export_only: 'Official export only',
  blocked: 'Protected',
  disabled: 'Unavailable',
});

export function isPolicy(value) {
  return POLICIES.includes(value);
}

export function moreRestrictive(a, b) {
  return (RESTRICTIVENESS[a] ?? 4) >= (RESTRICTIVENESS[b] ?? 4) ? a : b;
}

/**
 * Default attestation text when a platform entry doesn't provide its own.
 * @param {{ name: string, id: string }} platform
 */
export function defaultAttestation(platform) {
  if (platform.id === 'generic' || platform.id === 'direct') {
    return "Ferry doesn't know this site's download rules. Only download media you own or have the right to save.";
  }
  return `${platform.name}'s terms restrict downloading. Only download content you own or have permission from the rights holder to save.`;
}

/**
 * @typedef {{ policy: string, reason?: string, updatedAt?: string, updatedBy?: string }} Override
 * @typedef {{ status: string, category: number, reason: string|null, overridden: boolean, attestation: string|null }} EffectivePolicy
 */

/**
 * @param {{ id: string, name: string, category: number, policy: string, attestation?: string, available?: boolean }} platform
 * @param {Record<string, Override>} [overrides]
 * @returns {EffectivePolicy}
 */
export function effectivePolicy(platform, overrides = {}) {
  let status = platform.policy;
  let reason = null;
  let overridden = false;

  const own = overrides[platform.id];
  if (own && isPolicy(own.policy)) {
    status = own.policy;
    reason = own.reason ?? null;
    overridden = true;
  }
  const global = overrides['*'];
  if (global && isPolicy(global.policy) && moreRestrictive(global.policy, status) === global.policy && global.policy !== status) {
    status = global.policy;
    reason = global.reason ?? reason;
    overridden = true;
  }
  return {
    status,
    category: platform.category,
    reason,
    overridden,
    attestation: status === POLICY.ATTESTATION ? platform.attestation || defaultAttestation(platform) : null,
  };
}

/** Whether metadata may be fetched for a platform in this state. */
export function canProbe(status) {
  return status === POLICY.ALLOWED || status === POLICY.ATTESTATION;
}

/** Whether a download job may be created. */
export function canDownload(status, attested) {
  return status === POLICY.ALLOWED || (status === POLICY.ATTESTATION && attested === true);
}

/** Error code that explains why a status prevents work, or null. */
export function policyErrorCode(status) {
  switch (status) {
    case POLICY.BLOCKED:
      return 'PLATFORM_BLOCKED';
    case POLICY.EXPORT_ONLY:
      return 'EXPORT_ONLY';
    case POLICY.DISABLED:
      return 'PLATFORM_DISABLED';
    default:
      return null;
  }
}
