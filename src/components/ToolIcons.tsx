type IconProps = { className?: string };

export function MergeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 3v8a4 4 0 0 0 4 4h6M17 11l4 4-4 4M7 15v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SplitIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3v6M12 3l7 7M12 3 5 10M5 15v6h6M13 21h6v-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RotateIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 12a8 8 0 1 1 2.7 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3 15v4h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PdfToJpgIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="m9 16 2.2-2.6a1 1 0 0 1 1.5 0L15 16M15 13.5h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JpgToPdfIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect
        x="3"
        y="4"
        width="12"
        height="12"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="m5 13 2.2-2.6a1 1 0 0 1 1.5 0L11 13M18 9v9a1 1 0 0 1-1 1h-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeicToJpgIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m4 17 4.5-4.5a1 1 0 0 1 1.4 0L14 16.5m2-2 1.5-1.5a1 1 0 0 1 1.4 0L21 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WebpToPngIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2.5" y="6" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect
        x="11.5"
        y="8"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

export function SwapFormatIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2.5" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M11 6h4a2 2 0 0 1 2 2v1m-4-3-2 2 2 2M13 18H9a2 2 0 0 1-2-2v-1m4 3 2-2-2-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UniversalConverterIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 8a8 8 0 0 1 13.7-5.7M20 8V3m0 5h-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16a8 8 0 0 1-13.7 5.7M4 16v5m0-5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ImageResizerIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9 15 15 9m0 0h-4m4 0v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ImageCompressorIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9 7 5.5 10.5m0 0h3m-3 0v-3M15 17l3.5-3.5m0 0h-3m3 0v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RemoveExifIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3c3 1.5 5 1.8 7 1.8V11c0 5-3 8.3-7 9.2-4-.9-7-4.2-7-9.2V4.8c2 0 4-.3 7-1.8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 8a2.3 2.3 0 0 1 2.3 2.3c0 1.6-2.3 3.7-2.3 3.7s-2.3-2.1-2.3-3.7A2.3 2.3 0 0 1 12 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 16 16 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
