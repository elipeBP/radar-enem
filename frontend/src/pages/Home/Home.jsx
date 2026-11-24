
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import StatusBadge from '../../components/StatusBadge/statusBadge';
import {
  IconBuilding,
  IconChartBar,
  IconIdCard,
  IconPin,
  IconUsers,
} from '../../components/icons/Icons';
import { checkApiHealth } from '../../services/api';

const FILTROS = [
  {
    to: '/genero',
    icon: IconUsers,
    titulo: 'Trilha de Gênero',
    descricao:
      'Percentil da sua nota de Matemática por UF e composição por gênero dos inscritos.',
  },
  {
    to: '/nota-uf',
    icon: IconPin,
    titulo: 'Nota × UF',
    descricao: 'Compare sua nota com os participantes de uma unidade federativa.',
  },
  {
    to: '/areas',
    icon: IconChartBar,
    titulo: 'Nota × Área do Conhecimento',
    descricao: 'Veja sua área mais forte, mais fraca e a dispersão entre as 5 notas.',
  },
  {
    to: '/escola',
    icon: IconBuilding,
    titulo: 'Tipo de Escola',
    descricao: 'Percentil por UF e composição pública × privada dos participantes.',
  },
  {
    to: '/idade',
    icon: IconIdCard,
    titulo: 'Faixa Etária',
    descricao: 'Percentil por UF e composição por faixa etária dos inscritos.',
  },
];

function Home() {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    let ativo = true;

    checkApiHealth()
      .then(() => ativo && setApiStatus('online'))
      .catch(() => ativo && setApiStatus('offline'));

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
            RADAR ENEM
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl dark:text-white">
            Análise das desigualdades educacionais
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Informe sua nota e veja onde ela se posiciona entre os participantes
            reais do ENEM — cruzado com estado, gênero, tipo de escola, área do
            conhecimento e faixa etária. Escolha um filtro abaixo para começar.
          </p>
        </div>

        <StatusBadge status={apiStatus} />
      </header>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FILTROS.map(({ to, icon: Icon, titulo, descricao }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6
              shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md
              dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Icon className="size-6" />
            </span>

            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {titulo}
            </h2>

            <p className="mt-1.5 flex-1 text-sm text-slate-600 dark:text-slate-400">
              {descricao}
            </p>

            <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:underline dark:text-brand-400">
              Consultar →
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        Dados públicos do INEP (Microdados do ENEM), sem informação individual
        identificável. Projeto Integrador — Bacharelado em Ciência de Dados e
        Inteligência Artificial, Centro Universitário SENAI/SC.
      </footer>
    </div>
  );
}

export default Home;
