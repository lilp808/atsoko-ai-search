// Inline SVG icon set (no emoji, no extra deps).
// Stroke-based, inherits text color via currentColor.

type P = { size?: number; className?: string };

function base(size: number, className: string | undefined, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SparklesIcon({ size = 18, className }: P) {
  return base(size, className, <>
    <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" />
    <path d="M19 14l.9 2.4 2.4.9-2.4.9L19 20.6l-.9-2.4-2.4-.9 2.4-.9L19 14z" />
    <path d="M5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15z" />
  </>);
}

export function BrainIcon({ size = 26, className }: P) {
  return base(size, className, <>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01" strokeWidth={2.4} />
  </>);
}

export function CloseIcon({ size = 16, className }: P) {
  return base(size, className, <>
    <path d="M6 6l12 12M18 6L6 18" />
  </>);
}

export function CopyIcon({ size = 13, className }: P) {
  return base(size, className, <>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>);
}

export function ExternalIcon({ size = 15, className }: P) {
  return base(size, className, <>
    <path d="M14 4h6v6" />
    <path d="M20 4L11 13" />
    <path d="M20 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
  </>);
}
