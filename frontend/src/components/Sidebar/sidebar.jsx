
import { NavLink } from 'react-router-dom';
import './styles-sidebar/sidebar.css';

const LINKS = [
  {
    to: '/',
    label: 'Trilha de Gênero',
    icon: '/icons/casa.svg',
  },
  {
    to: '/areas',
    label: 'Nota × Área do Conhecimento',
    icon: '/icons/stats.svg',
  },
  {
    to: '/escola',
    label: 'Tipo de Escola',
    icon: '/icons/usuarios.svg',
  },
];

function Sidebar({ expandida, onToggle }) {
  return (
    <aside
      id="app-sidebar"
      className={`sidebar ${expandida ? 'sidebar--expanded' : 'sidebar--collapsed'}`}
    >
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <img
            src="/radar.svg"
            alt=""
            className="sidebar__logo"
          />

          {expandida && (
            <div className="sidebar__brand-text">
              <span className="sidebar__brand-name">Radar ENEM</span>
              <span className="sidebar__brand-description">
                Análise das desigualdades educacionais
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={
            expandida ? 'Recolher barra lateral' : 'Expandir barra lateral'
          }
          aria-expanded={expandida}
          aria-controls="app-sidebar-navigation"
          title={expandida ? 'Recolher menu' : 'Expandir menu'}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav
        id="app-sidebar-navigation"
        className="sidebar__navigation"
        aria-label="Navegação principal"
      >
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            aria-label={link.label}
            title={!expandida ? link.label : undefined}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            <img
              src={link.icon}
              alt=""
              aria-hidden="true"
              className="sidebar__icon"
            />

            {expandida && (
              <span className="sidebar__link-label">
                {link.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {expandida && (
          <span className="sidebar__footer-text">
            Plataforma de análise do ENEM
          </span>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
