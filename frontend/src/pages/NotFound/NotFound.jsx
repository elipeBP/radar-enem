
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16 md:min-h-full">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
          404
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
          Página não encontrada
        </h1>

        <p className="mt-3 text-slate-600 dark:text-slate-400">
          A página que você tentou acessar não existe ou foi movida.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}

export default NotFound;
