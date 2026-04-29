/**
 * Validate a post-login redirect target to prevent open redirects.
 *
 * Only same-origin, single-leading-slash paths are allowed. Anything else
 * (protocol-relative `//evil`, full URLs `https://evil`, or empty) falls back
 * to the provided default (defaults to "/").
 */
export function safeRedirectPath(path: string | undefined | null, fallback: string = '/'): string {
    if (!path || typeof path !== 'string') {
        return fallback;
    }

    // Must start with a single "/" and not "//" (protocol-relative) or "/\" (Windows-style).
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
        return fallback;
    }

    // Reject anything containing a scheme separator or control characters.
    if (/[\x00-\x1f]/.test(path) || /^\/+[a-z][a-z0-9+.-]*:/i.test(path)) {
        return fallback;
    }

    return path;
}
