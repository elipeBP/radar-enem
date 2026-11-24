
import { useEffect, useState } from 'react';

import StatusBadge from '../../components/StatusBadge/statusBadge';
import ResultadoGenero from '../../components/ResultadoGenero/ResultadoGenero';
import FiltrosDashboard from '../../components/FiltrosDashboard/FiltrosDashboard';
import { checkApiHealth, consultarGenero } from '../../services/api';

function Genero() {
  const [ano, setAno] = useState('2025');
  const [estados, setEstados] = useState(['SC']);
  const [notaMatematica, setNotaMatematica] = useState('');

  const [apiStatus, setApiStatus] = useState('checking');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ativo = true;

    async function verificarAPI() {
      try {
        await checkApiHealth();
        if (ativo) setApiStatus('online');
      } catch {
        if (ativo) setApiStatus('offline');
      }
    }

    verificarAPI();

    return () => {
      ativo = false;
    };
  }, []);

  async function handleConsultar() {
    setLoading(true);
    setError('');
    setResultado(null);

    try {
      const resposta = await consultarGenero({
        ano: Number(ano),
        estados,
        notaMatematica: notaMatematica === '' ? null : Number(notaMatematica),
      });

      setResultado(resposta?.dados ?? resposta);
    } catch (err) {
      setError(err?.message || 'Ocorreu um erro ao consultar os dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
            FILTRO 3
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Trilha de Gênero nas Exatas
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Percentil da sua nota de Matemática entre os participantes da(s)
            UF(s) escolhida(s), ao lado da composição por gênero dos
            inscritos — duas estatísticas independentes, sem correlação
            entre nota e gênero.
          </p>
        </div>

        <StatusBadge status={apiStatus} />
      </header>

      <div className="mt-8">
        <FiltrosDashboard
          ano={ano}
          setAno={setAno}
          estados={estados}
          setEstados={setEstados}
          notaMatematica={notaMatematica}
          setNotaMatematica={setNotaMatematica}
          onConsultar={handleConsultar}
          loading={loading}
        />
      </div>

      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Resultados da consulta
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Os indicadores abaixo são atualizados após uma consulta.
          </p>
        </div>

        <ResultadoGenero resultado={resultado} loading={loading} error={error} />
      </div>
    </div>
  );
}

export default Genero;
