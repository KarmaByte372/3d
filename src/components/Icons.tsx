/** Hafif çizgi ikon seti (24x24, stroke). */
type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconCube = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9Z" /><path d="M3.5 7.5 12 12.2l8.5-4.7M12 12.2v9" /></svg>
);
export const IconLayers = ({ className }: P) => (
  <svg {...base(className)}><path d="m12 3 9 4.5-9 4.5-9-4.5Z" /><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" /></svg>
);
export const IconNozzle = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 3h10v5H7zM9 8h6l-1.5 5h-3Z" /><path d="M12 13v2M6 21h12M9 18h6" /></svg>
);
export const IconUpload = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);
export const IconQuote = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 5h16v11H8l-4 4Z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
);
export const IconTruck = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>
);
export const IconWallet = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><path d="M4 7.5V17a2 2 0 0 0 2 2h14V9H6.5A2.5 2.5 0 0 1 4 7.5Z" /><circle cx="16" cy="14" r="1.2" /></svg>
);
export const IconShield = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
);
export const IconCalendar = ({ className }: P) => (
  <svg {...base(className)}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M12 13h3v3h-3z" /></svg>
);
export const IconChart = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 20V4M4 20h16" /><path d="m7.5 15 3.5-4 3 2.5 5-6" /></svg>
);
export const IconUsers = ({ className }: P) => (
  <svg {...base(className)}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.7-3.2 3.1-5 6-5s5.3 1.8 6 5" /><path d="M15.5 5.5a3.2 3.2 0 0 1 0 6.2M17.5 14.8c1.8.6 3 2.2 3.5 4.7" /></svg>
);
export const IconBox = ({ className }: P) => (
  <svg {...base(className)}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.3l8.4 4.5" /></svg>
);
export const IconClock = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconBank = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 9.5 12 4l9 5.5M4.5 10v7.5M9.5 10v7.5M14.5 10v7.5M19.5 10v7.5M3 20.5h18" /></svg>
);
export const IconCard = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></svg>
);
export const IconSettings = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>
);
export const IconHome = ({ className }: P) => (
  <svg {...base(className)}><path d="m3.5 11 8.5-7 8.5 7" /><path d="M5.5 9.5V20h13V9.5" /></svg>
);
export const IconUser = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c.9-3.8 3.9-6 7.5-6s6.6 2.2 7.5 6" /></svg>
);
export const IconPlus = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconSearch = ({ className }: P) => (
  <svg {...base(className)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const IconPin = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 21s6.5-6.1 6.5-11.2a6.5 6.5 0 1 0-13 0C5.5 14.9 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.3" /></svg>
);
export const IconFile = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 3h8l4.5 4.5V21H6Z" /><path d="M14 3v4.5h4.5" /><path d="m9 15 3-1.7 3 1.7-3 1.7Z" /></svg>
);
export const IconArrowRight = ({ className }: P) => (
  <svg {...base(className)}><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
);
export const IconCheck = ({ className }: P) => (
  <svg {...base(className)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconLogout = ({ className }: P) => (
  <svg {...base(className)}><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></svg>
);
export const IconBell = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
);
export const IconMessage = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 5h16v11H9l-5 4Z" /></svg>
);
export const IconStar = ({ className }: P) => (
  <svg {...base(className)}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" /></svg>
);
export const IconAlert = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3.5 21 19.5H3Z" /><path d="M12 10v4M12 16.8v.2" /></svg>
);
