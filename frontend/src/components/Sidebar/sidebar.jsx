import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import {
  IconBuilding,
  IconChartBar,
  IconChevronLeft,
  IconHome,
  IconIdCard,
  IconMoon,
  IconPin,
  IconSun,
  IconUsers,
  IconX,
} from '../icons/Icons';

const LINKS = [
  { to: '/', label: 'Início', icon: IconHome, end: true },
  { to: '/genero', label: 'Trilha de Gênero', icon: IconUsers },
  { to: '/nota-uf', label: 'Nota × UF', icon: IconPin },
  { to: '/areas', label: 'Nota × Área do Conhecimento', icon: IconChartBar },
  { to: '/escola', label: 'Tipo de Escola', icon: IconBuilding },
  { to: '/idade', label: 'Faixa Etária', icon: IconIdCard },
];

function Sidebar({ expandida, onToggleExpandida, aberta, onFecharMobile }) {
  const { escuro, alternarTema } = useTheme();

  return (
    <>
      {aberta && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onFecharMobile}
          className="fixed inset-0 z-30 bg-slate-950/60 md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-slate-900 text-slate-300
          transition-transform duration-200 ease-out
          ${aberta ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:transition-[width] md:duration-200
          ${expandida ? 'w-72' : 'md:w-[76px]'} w-72`}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4">
          <img src="/radar.svg" alt="" className="size-8 shrink-0" />

          {(expandida || aberta) && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-white">Radar ENEM</span>
              <span className="truncate text-xs text-slate-400">
                Análise das desigualdades educacionais
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onFecharMobile}
            aria-label="Fechar menu"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          >
            <IconX className="size-5" />
          </button>

          <button
            type="button"
            onClick={onToggleExpandida}
            aria-label={expandida ? 'Recolher barra lateral' : 'Expandir barra lateral'}
            aria-expanded={expandida}
            aria-controls="app-sidebar-navigation"
            title={expandida ? 'Recolher menu' : 'Expandir menu'}
            className="ml-auto hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:block"
          >
            <IconChevronLeft
              className={`size-4.5 transition-transform duration-200 ${expandida ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        <nav
          id="app-sidebar-navigation"
          aria-label="Navegação principal"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        >
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onFecharMobile}
              aria-label={label}
              title={!expandida && !aberta ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-brand-600 text-white'
                   : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon className="size-5 shrink-0" />
              {(expandida || aberta) && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={alternarTema}
            title={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
              text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {escuro ? <IconSun className="size-5 shrink-0" /> : <IconMoon className="size-5 shrink-0" />}
            {(expandida || aberta) && <span>{escuro ? 'Tema claro' : 'Tema escuro'}</span>}
          </button>

          {(expandida || aberta) && (
            <p className="mt-3 px-3 text-xs text-slate-500">
              Plataforma de análise do ENEM
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
