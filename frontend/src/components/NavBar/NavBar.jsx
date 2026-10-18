import { NavLink } from 'react-router-dom';

import './styles-nav-bar/NavBar.css';

const LINKS = [
  { to: '/', label: 'Trilha de Gênero' },
  { to: '/areas', label: 'Nota × Área do Conhecimento' },
];

function NavBar() {
  return (
    <nav className="nav-bar">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default NavBar;
