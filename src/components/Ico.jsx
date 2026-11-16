// Small stroke-based line icons shared by the role dashboards.
// 24x24 viewBox, currentColor strokes — same visual language as the resident dashboard.
export const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></>,
  schedule: <><rect x="3" y="5" width="18" height="16" rx="2.6" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  rewards: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M12 8c-2.5 0-4-1-4-2.5S9.5 3 12 5c2.5-2 4-1 4 .5S14.5 8 12 8z" /></>,
  report: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v5M12 17.4v.2" /></>,
  tickets: <><path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z" /><path d="M14 6v12" strokeDasharray="2 2.4" /></>,
  guide: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M9 7.5h6" /></>,
  logout: <><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  leaf: <><path d="M11 20c-4 0-7-3-7-8 0-4 4-8 13-8 0 9-4 16-11 16Z" /><path d="M4 20c6 0 10-4 12-9" /></>,
  recycle: <><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8" /><path d="M18.5 2v4h-4M5.5 22v-4h4" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  truck: <><path d="M2 7h11v10H2zM13 10h5l3.5 4v3h-9" /><circle cx="6" cy="18.5" r="1.6" /><circle cx="16.5" cy="18.5" r="1.6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20c.6-3.6 3-5.4 5.5-5.4s4.9 1.8 5.5 5.4" /><circle cx="17" cy="9.5" r="2.6" /><path d="M15.5 14.8c2.8.2 4.2 2 4.7 5.2" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /></>,
  ticket: <><path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z" /><path d="M14 6v12" /></>,
  chart: <><path d="M4 20h16" /><path d="M7 16v-6M12 16V6M17 16v-9" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2.6" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9 16 2 2 4-4" /></>,
  pin: <><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></>,
  box: <><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
};

export default function Ico({ n, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[n] || ICON_PATHS.dashboard}
    </svg>
  );
}
