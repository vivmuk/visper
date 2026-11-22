// Small inline icon set (stroke icons, 24px grid) so we don't need an icon library.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...props }: IconProps & { children: React.ReactNode }) {
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
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);
export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
);
export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z" />
    <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z" />
  </Svg>
);
export const PhotoIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </Svg>
);
export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 4.9L19 9.7l-4.9 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8Z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
  </Svg>
);
export const MicIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M12 17v4" />
  </Svg>
);
export const StopIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </Svg>
);
export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 4h-5L7.5 6.5H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3.5Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);
export const EditIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
);
export const SendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4Z" />
  </Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);
export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7" cy="7" r="1.5" />
  </Svg>
);
export const CloudOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m2 2 20 20" />
    <path d="M5.8 5.8A7 7 0 0 0 7 19h10a5 5 0 0 0 2.3-.6" />
    <path d="M21.6 15.7A5 5 0 0 0 17 9h-1.3A7 7 0 0 0 9.4 4.3" />
  </Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);
export const LogOutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);
export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
);
export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Svg>
);
export const DotsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
  </Svg>
);
