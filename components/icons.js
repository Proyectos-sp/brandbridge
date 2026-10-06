// Íconos de línea dibujados a mano (mismo trazo y tamaño en toda la app).
function Icon({ size = 18, strokeWidth = 1.8, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const CloseIcon = (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>;
export const ChevronDownIcon = (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const ArrowUpRightIcon = (p) => <Icon {...p}><path d="M7 17 17 7M8 7h9v9" /></Icon>;
export const ArrowRightIcon = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const SendIcon = (p) => <Icon {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Icon>;
export const AlertIcon = (p) => <Icon {...p}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></Icon>;
export const RetryIcon = (p) => <Icon {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></Icon>;
export const GlobeIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></Icon>;
export const InstagramIcon = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></Icon>;
export const PlaneIcon = (p) => <Icon {...p}><path d="M21 4 3 11l7 2.5L12.5 21 21 4Z" /><path d="m10 13.5 4.5-4.5" /></Icon>;
export const ChatIcon = (p) => <Icon {...p}><path d="M4 5h16v11H9l-5 4V5Z" /></Icon>;
export const ChartIcon = (p) => <Icon {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></Icon>;
export const MailIcon = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>;
export const LockIcon = (p) => <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
export const CheckIcon = (p) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const HeartIcon = ({ filled, ...p }) => <Icon {...p}><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" fill={filled ? "currentColor" : "none"} /></Icon>;
export const CompareIcon = (p) => <Icon {...p}><rect x="3" y="5" width="7" height="14" rx="1.5" /><rect x="14" y="5" width="7" height="14" rx="1.5" /></Icon>;
export const PlusIcon = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const CompassIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></Icon>;
export const UserIcon = (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.4-5 8-5s6.5 1.5 8 5" /></Icon>;
export const ShieldIcon = (p) => <Icon {...p}><path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Icon>;
export const InfoIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>;

// Triángulo sólido que acompaña a los botones píldora.
export function PlayIcon({ size = 10, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" focusable="false" {...rest}>
      <path d="M2 1.2v7.6a.6.6 0 0 0 .9.5l6-3.8a.6.6 0 0 0 0-1L2.9.7a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  );
}

// Marca de BrandBridge: tres barras que suben, como un puntaje que crece de un país a otro.
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#12223A" />
      <rect x="6" y="17" width="6" height="9" rx="1.5" fill="#18B2C2" />
      <rect x="13" y="12" width="6" height="14" rx="1.5" fill="#FF5C9D" />
      <rect x="20" y="7" width="6" height="19" rx="1.5" fill="#FFC83A" />
    </svg>
  );
}
