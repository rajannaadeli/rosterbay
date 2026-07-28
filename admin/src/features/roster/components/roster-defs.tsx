/**
 * Document-global SVG pattern definitions for the roster.
 *
 * Rendered once at the roster root; every unfilled bar and every unfilled
 * coverage cell references these by id (`fill="url(#rb-hatch-danger)"`). SVG
 * defs resolve across separate `<svg>` elements in the same document, so one
 * definition serves a hundred bars without re-declaring the geometry.
 *
 * The hatch is what makes an unfilled shift unmistakable at a glance — colour
 * alone would put the whole burden on the red/green axis, which is exactly
 * what a colour-blind ops manager can't use. Texture is the redundant channel.
 */
export function RosterDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute" focusable="false">
      <defs>
        {/* 45° diagonal hatch. currentColor doesn't reach into a <defs> from
            the referencing element, so the stroke is bound to the danger token
            directly — it is only ever used for unfilled/blocked states. */}
        <pattern
          id="rb-hatch-danger"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--danger)" strokeWidth="1.5" opacity="0.32" />
        </pattern>

        {/* Denser variant for the coverage ribbon's 8px-tall cells, where the
            6px pitch above reads as a solid block. */}
        <pattern
          id="rb-hatch-danger-dense"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--danger)" strokeWidth="1" opacity="0.45" />
        </pattern>

        {/* Sheen sweep for in-progress bars — a soft accent highlight that
            travels left to right. Animated by CSS on the referencing element,
            so prefers-reduced-motion can stop it in one place. */}
        <linearGradient id="rb-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
