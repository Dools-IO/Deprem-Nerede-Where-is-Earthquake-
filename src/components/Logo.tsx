/* Marka ikonu: küre + merkez üssü dalgaları. public/icon.svg ile aynı çizim; birlikte güncelleyin */
export default function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id="logo-o" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#1e3a5f" />
          <stop offset="1" stopColor="#0b1220" />
        </radialGradient>
        <clipPath id="logo-c">
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#logo-o)" />
      <g clipPath="url(#logo-c)" fill="none" stroke="#38bdf8" strokeOpacity=".35" strokeWidth="1.6">
        <ellipse cx="32" cy="32" rx="12" ry="29" />
        <path d="M3 22h58M3 42h58M32 3v58" />
      </g>
      <g fill="none" stroke="#ff5a36" strokeLinecap="round">
        <circle cx="38" cy="27" r="7" strokeWidth="3" />
        <circle cx="38" cy="27" r="13" strokeWidth="2.4" strokeOpacity=".6" />
        <circle cx="38" cy="27" r="19" strokeWidth="1.8" strokeOpacity=".3" />
      </g>
      <circle cx="38" cy="27" r="3.4" fill="#ff5a36" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#38bdf8" strokeOpacity=".5" strokeWidth="2" />
    </svg>
  );
}
