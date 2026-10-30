/** Line-art SVG icon on a 20×20 grid (stroke = currentColor). Children are the paths. */
export default function Icon({ size = 16, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/** The ✕ close glyph used on panel/window headers. */
export const CloseIcon = () => <Icon size={14}><path d="M6 6l8 8M14 6l-8 8" /></Icon>;
