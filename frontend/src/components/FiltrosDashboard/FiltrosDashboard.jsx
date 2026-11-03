
import MapaBrasil from '../MapaInterativo/MapaBrasil';

import './styles-filtros-dashboard/FiltrosDashboard.css';

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
  'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function FiltrosDashboard({
  ano,
  setAno,
  estados,
  setEstados,
  notaMatematica,
  setNotaMatematica,
  onConsultar,
  loading,
}) {
  function removerEstado(estado) {
    setEstados((atuais) =>
      atuais.filter((item) => item !== estado),
    );
  }

  const estadosResumo = [...estados].sort(
    (a, b) => estadosBrasil.indexOf(a) - estadosBrasil.indexOf(b),
  );

  return (
    <section className="filtros-dashboard">
      <div
        className="filtros-dashboard__summary"
        aria-label="Filtros da consulta"
      >
        <h2 className="filtros-dashboard__summary-title">
          Filtros selecionados
        </h2>

        <div className="filtros-dashboard__summary-grid">
          <div className="filtros-dashboard__summary-card">
            <label
              className="filtros-dashboard__summary-label"
              htmlFor="filtro-ano"
            >
              Ano
            </label>

            <select
              id="filtro-ano"
              className="filtros-dashboard__summary-input filtros-dashboard__summary-input--center"
              value={ano}
              onChange={(event) => setAno(event.target.value)}
            >
              {Array.from({ length: 10 }, (_, index) => 2025 - index).map(
                (valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="filtros-dashboard__summary-card filtros-dashboard__summary-card--states">
            <div className="filtros-dashboard__summary-state-header">
              <span className="filtros-dashboard__summary-label">
                Estados
              </span>

              <span className="filtros-dashboard__count-badge">
                {estados.length} selecionado(s)
              </span>
            </div>

            {estadosResumo.length > 0 ? (
              <div className="filtros-dashboard__selected-states">
                {estadosResumo.slice(0, 5).map((estado) => (
                  <button
                    type="button"
                    key={estado}
                    className="filtros-dashboard__selected-state"
                    onClick={() => removerEstado(estado)}
                    aria-label={`Remover ${estado} da seleção`}
                    title={`Remover ${estado}`}
                  >
                    {estado}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}

                {estadosResumo.length > 5 && (
                  <span className="filtros-dashboard__more-states">
                    +{estadosResumo.length - 5}
                  </span>
                )}
              </div>
            ) : (
              <span className="filtros-dashboard__no-state">
                Nenhum estado selecionado
              </span>
            )}
          </div>

          <div className="filtros-dashboard__summary-card">
            <label
              className="filtros-dashboard__summary-label"
              htmlFor="filtro-nota-matematica"
            >
              Nota Matemática
            </label>

            <input
              id="filtro-nota-matematica"
              className="filtros-dashboard__summary-input filtros-dashboard__summary-input--center"
              type="number"
              min="0"
              max="1000"
              step="1"
              placeholder="Qualquer nota"
              value={notaMatematica}
              onChange={(event) =>
                setNotaMatematica(event.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="filtros-dashboard__map-section">
        <div className="filtros-dashboard__map-heading">
          <div>
            <h2>Seleção de estados</h2>
            <p>
              Escolha no mapa as UFs que deseja incluir na análise.
            </p>
          </div>
        </div>

        <MapaBrasil
          estados={estados}
          setEstados={setEstados}
        />
      </div>

      <div className="filtros-dashboard__footer">
        <p className="filtros-dashboard__footer-hint">
          {estados.length === 0
            ? 'Selecione ao menos um estado para realizar a consulta.'
            : `${estados.length} estado(s) selecionado(s) para a consulta.`}
        </p>

        <button
          type="button"
          className="filtros-dashboard__submit"
          onClick={onConsultar}
          disabled={loading || estados.length === 0}
        >
          {loading ? 'Consultando...' : 'Consultar dados'}
        </button>
      </div>
    </section>
  );
}

export default FiltrosDashboard;
