/**
 * Kodelyth mark — exact coordinates from brand/kodelyth-mark.svg
 * Ghost (left, 15% opacity) + Solid (right, full weight).
 * Inverted to white for dark backgrounds.
 */
export function KodeLythMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* ghost — left, recedes behind */}
      <polyline
        points="128,104 184,200 128,296"
        stroke="#ffffff"
        strokeWidth="10"
        strokeOpacity="0.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* solid — primary mark, full weight */}
      <polyline
        points="172,100 260,200 172,300"
        stroke="#ffffff"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
