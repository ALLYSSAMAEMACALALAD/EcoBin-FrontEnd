/**
 * Minimal stroke icons used across Eco-Bin.
 * Inherit color from the currentColor context; sizes via font-size on the parent.
 * No fill — keeps surfaces quiet and text-led.
 */
export function LeafIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20c-4 0-7-3-7-8 0-4 4-8 13-8 0 9-4 16-11 16Z" />
      <path d="M4 20c6 0 10-4 12-9" />
    </svg>
  );
}

export function BellIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10 21h4" />
    </svg>
  );
}

export function ArrowRightIcon({ className = '', size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function EyeIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export function EyeOffIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.4A10.6 10.6 0 0 1 12 5.3c7 0 10.5 6.7 10.5 6.7a17.2 17.2 0 0 1-3.4 4.4M6.6 6.6A16.7 16.7 0 0 0 1.5 12s3.5 6.7 10.5 6.7c2 0 3.7-.6 5.2-1.6" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export function BinIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h16" />
      <path d="M10 8V5h4v3" />
      <path d="M6.5 8l1.2 12.2a2 2 0 0 0 2 1.8h4.6a2 2 0 0 0 2-1.8L17.5 8" />
    </svg>
  );
}

export function BottleIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3h4" />
      <path d="M11 3v3.5c0 1.3-1 2.2-1 4.3 0 1 .4 2 .5 3 0 3.5 1 5 1.5 5s1.5-1.5 1.5-5c0-1 .4-2 .5-3 .1-2-.9-3-.9-4.3V3" />
    </svg>
  );
}

export function PaperIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M13 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function CanIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="7" width="12" height="15" rx="2.5" />
      <path d="M6 10h12" />
      <path d="M8 7l1-3h6l1 3" />
    </svg>
  );
}

export function GlassIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10l-1 5a8 8 0 1 1-8 0l-1-5Z" />
    </svg>
  );
}

export function EwasteIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="8" width="12" height="10" rx="2" />
      <path d="M12 8V5M9 5h6" />
      <circle cx="10" cy="12" r=".5" /><circle cx="14" cy="12" r=".5" />
    </svg>
  );
}

export function ShirtIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3l-6 4 2 4 3-2v12h10V9l3 2 2-4-6-4a4 4 0 0 1-8 0Z" />
    </svg>
  );
}

export function GiftIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="4" rx="1" />
      <path d="M5 13v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <path d="M12 9v13M12 9c-1.5-1.2-4-1.6-5.2.4-.9 1.5.3 3 2 3h3.2M12 9c1.5-1.2 4-1.6 5.2.4.9 1.5-.3 3-2 3h-3.2" />
    </svg>
  );
}
