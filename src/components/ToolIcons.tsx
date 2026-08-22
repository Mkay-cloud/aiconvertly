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

export function Mp4ToMp3Icon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="m8 7 4 3-4 3V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M17 10v7.2a1.8 1.8 0 1 1-1.2-1.7M17 10l4-1v6.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoConverterIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2.5" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="m6.5 6.5 4 2-4 2v-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M13 17h5a2 2 0 0 0 2-2v-1m-2-2 2 2-2 2M18 8V6a2 2 0 0 0-2-2h-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AudioConverterIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 13v-2M8 15v-6M12 17V7M16 15v-6M20 13v-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6 20h2m8-16h2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VideoToGifIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="m7.5 7.5 4 2.5-4 2.5v-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M17.5 12a3.5 3.5 0 1 1-1-2.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M20.5 9.5v2h-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrimIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 6h16M4 18h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeDasharray="1 3.4" />
      <circle cx="7" cy="6" r="2.3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17" cy="18" r="2.3" stroke="currentColor" strokeWidth="1.75" />
      <path d="m8.6 7.6 6.8 8.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m15.4 7.6-2 2.6M8.6 16.4l2-2.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function CompressVideoIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="m9.5 8.5-3.5 3.5m0 0h3m-3 0v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14.5 15.5 3.5-3.5m0 0h-3m3 0v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RemoveAudioIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 10v4h3.5L12 17.5v-11L7.5 10H4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M16 9.5 21 14.5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function MergeVideosIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2.5" y="4" width="10" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="13" width="10" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3M17 8l3 2.5-3 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoSpeedIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 13 15.5 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M9 3h6M12 3v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function MergeAudioIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 12h1.5M6 9v6M9 6v12M12 12h.01M15 6v12M18 9v6M20.5 12H22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VideoResolutionIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="6" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M2 3v4m0-4h4M22 3v4m0-4h-4M2 21v-4m0 4h4M22 21v-4m0 4h-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EnhanceImageIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 3v4M3 5h4M19 13v4M17 15h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M13.5 4.5 15 8l3.5 1.5L15 11l-1.5 3.5L12 11l-3.5-1.5L12 8l1.5-3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EnhanceVideoIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2.5" y="6" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="m6.5 8.5 4 2-4 2v-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M18.5 4.5 19.6 7l2.5 1.1-2.5 1.1-1.1 2.5-1.1-2.5-2.5-1.1 2.5-1.1 1.1-2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
