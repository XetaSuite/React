/**
 * Escape a string for safe inclusion inside HTML text content / attributes.
 *
 * Used when we have to write HTML strings to a document we don't control
 * with React (e.g. `printWindow.document.write`).
 */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
