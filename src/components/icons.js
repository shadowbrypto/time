// Solid, SF Symbols-style glyphs for the navigation, taken from the stageshow
// kit (kit/parts/Icon.tsx, MIT). Stageshow's icon rules, applied to the sidebar:
//   - an Apple look takes filled system-style glyphs, not thin outlines;
//   - one family, one size per surface (16px in the sidebar, even box);
//   - one opaque colour (currentColor); cut-outs use the even-odd rule.
const paths = {
  clock: "M8 1.25a6.75 6.75 0 1 1 0 13.5 6.75 6.75 0 0 1 0-13.5Zm-.75 3v4.2l2.9 1.75.75-1.25-2.15-1.3V4.25Z",
  calendar:
    "M3.5 2h9A2 2 0 0 1 14.5 4v8.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm-.5 4.5v6a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-6ZM4.2 7.6h1.6v1.6h-1.6ZM7.2 7.6h1.6v1.6h-1.6ZM10.2 7.6h1.6v1.6h-1.6ZM4.2 10.2h1.6v1.6h-1.6ZM7.2 10.2h1.6v1.6h-1.6ZM10.2 10.2h1.6v1.6h-1.6Z",
}

export function Glyph({ name, size = 16, className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} className={className}>
      <path d={paths[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

// Utility icons come from lucide (the project's own pack). Drawn at an
// absolute 1.5px stroke so they match each other at any size, and filled
// where the shape allows so they sit with the solid navigation glyphs.
export const utilityIcon = { size: 16, strokeWidth: 1.5, absoluteStrokeWidth: true }
