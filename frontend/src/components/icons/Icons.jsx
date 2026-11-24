// Ícones SVG inline, simples e desenhados à mão (sem biblioteca externa).
// Todos usam stroke="currentColor" -- herdam a cor do texto, funcionam em
// dark mode e no estado ativo/hover só trocando a classe de cor do pai.

function Base({ children, className = 'size-5', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props) {
  return (
    <Base {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </Base>
  );
}

export function IconUsers(props) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.5 12c2.3.3 4 2 4 4.3" />
    </Base>
  );
}

export function IconChartBar(props) {
  return (
    <Base {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </Base>
  );
}

export function IconBuilding(props) {
  return (
    <Base {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.2" />
      <path d="M9 7h1.4M13.6 7H15M9 11h1.4M13.6 11H15M9 15h1.4M13.6 15H15" />
      <path d="M10.5 21v-3a1.5 1.5 0 0 1 3 0v3" />
    </Base>
  );
}

export function IconIdCard(props) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="1.6" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c0-1.4 1.4-2.3 3-2.3s3 .9 3 2.3" />
      <path d="M14.5 9.5h4M14.5 13h4" />
    </Base>
  );
}

export function IconSun(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </Base>
  );
}

export function IconMoon(props) {
  return (
    <Base {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Base>
  );
}

export function IconMenu(props) {
  return (
    <Base {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  );
}

export function IconX(props) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

export function IconChevronLeft(props) {
  return (
    <Base {...props}>
      <path d="M14.5 5 8 12l6.5 7" />
    </Base>
  );
}

export function IconPin(props) {
  return (
    <Base {...props}>
      <path d="M12 21.5S19 15 19 10.5a7 7 0 1 0-14 0C5 15 12 21.5 12 21.5Z" />
      <circle cx="12" cy="10.5" r="2.6" />
    </Base>
  );
}
