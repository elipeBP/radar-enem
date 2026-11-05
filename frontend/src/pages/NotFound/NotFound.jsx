
import { Link } from 'react-router-dom';

import './styles-not-found/NotFound.css';

function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found__content">
        <p className="not-found__code">404</p>

        <h1 className="not-found__title">Página não encontrada</h1>

        <p className="not-found__description">
          A página que você tentou acessar não existe ou foi movida.
        </p>

        <Link className="not-found__link" to="/">
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}

export default NotFound;

