
import { useEffect, useState } from 'react';

import Sidebar from '../../components/Sidebar/sidebar';
import StatusBadge from '../../components/StatusBadge/statusBadge';
import ResultadoGenero from '../../components/ResultadoGenero/ResultadoGenero';
import { checkApiHealth, consultarGenero } from '../../services/api';

import './styles-dashboard/Dashboard.css';

function Dashboard() {
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

        if (ativo) {
          setApiStatus('online');
        }
      } catch {
        if (ativo) {
          setApiStatus('offline');
        }
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
        notaMatematica:
          notaMatematica === '' ? null : Number(notaMatematica),
      });

      setResultado(resposta?.dados ?? resposta);
    } catch (err) {
      setError(
        err?.message || 'Ocorreu um erro ao consultar os dados.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard">
      <Sidebar
        ano={ano}
        setAno={setAno}
        estados={estados}
        setEstados={setEstados}
        notaMatematica={notaMatematica}
        setNotaMatematica={setNotaMatematica}
        onConsultar={handleConsultar}
        loading={loading}
      />

      <main className="dashboard__main">
        <div className="dashboard__container">
          <header className="dashboard__header">
            <div>
              <p className="dashboard__eyebrow">RADAR ENEM</p>
              <h1 className="dashboard__title">
                Dashboard de desempenho
              </h1>
              <p className="dashboard__description">
                Explore os dados do ENEM e compare o desempenho conforme
                os filtros selecionados.
              </p>
            </div>

            <StatusBadge status={apiStatus} />
          </header>

          <section className="dashboard__section">
            <div className="dashboard__section-heading">
              <h2>Resultados da consulta</h2>
              <p>
                Os indicadores abaixo são atualizados após uma consulta.
              </p>
            </div>

            <ResultadoGenero
              resultado={resultado}
              loading={loading}
              error={error}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

