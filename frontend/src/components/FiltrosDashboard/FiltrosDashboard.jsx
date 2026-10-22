
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
  function alternarEstado(estado) {
    setEstados((atuais) =>
      atuais.includes(estado)
        ? atuais.filter((item) => item !== estado)
        : [...atuais, estado],
    );
  }

  return (
    <section className="filtros-dashboard">
      <header className="filtros-dashboard__header">
        <div>
          <h2 className="filtros-dashboard__title">
            Filtros da consulta
          </h2>

          <p className="filtros-dashboard__description">
            Defina os critérios para analisar os resultados do ENEM.
          </p>
        </div>
      </header>

      <div className="filtros-dashboard__form">
        <div className="filtros-dashboard__primary-fields">
          <div className="filtros-dashboard__field">
            <label
              className="filtros-dashboard__label"
              htmlFor="filtro-ano"
            >
              Ano do ENEM
            </label>

            <select
              id="filtro-ano"
              className="filtros-dashboard__input"
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

          <div className="filtros-dashboard__field">
            <label
              className="filtros-dashboard__label"
              htmlFor="filtro-nota-matematica"
            >
              Nota mínima em Matemática
            </label>

            <input
              id="filtro-nota-matematica"
              className="filtros-dashboard__input"
              type="number"
              min="0"
              max="1000"
              step="1"
              placeholder="Ex.: 700"
              value={notaMatematica}
              onChange={(event) =>
                setNotaMatematica(event.target.value)
              }
            />
          </div>
        </div>

        <fieldset className="filtros-dashboard__states-field">
          <legend className="filtros-dashboard__legend">
            Estados da prova
          </legend>

          <div className="filtros-dashboard__states-toolbar">
            <span className="filtros-dashboard__counter">
              {estados.length} de {estadosBrasil.length} estados selecionados
            </span>

            <div className="filtros-dashboard__actions">
              <button
                type="button"
                className="filtros-dashboard__action-button"
                onClick={() => setEstados([...estadosBrasil])}
              >
                Selecionar todos
              </button>

              <span className="filtros-dashboard__action-separator">
                ·
              </span>

              <button
                type="button"
                className="filtros-dashboard__action-button"
                onClick={() => setEstados([])}
              >
                Limpar seleção
              </button>
            </div>
          </div>

          <div className="filtros-dashboard__states-grid">
            {estadosBrasil.map((estado) => {
              const selecionado = estados.includes(estado);

              return (
                <label
                  key={estado}
                  className={`filtros-dashboard__state-option${
                    selecionado
                      ? ' filtros-dashboard__state-option--selected'
                      : ''
                  }`}
                >
                  <input
                    className="filtros-dashboard__checkbox"
                    type="checkbox"
                    checked={selecionado}
                    onChange={() => alternarEstado(estado)}
                  />

                  <span>{estado}</span>
                </label>
              );
            })}
          </div>

          <p className="filtros-dashboard__hint">
            Selecione um ou mais estados para restringir a consulta.
          </p>
        </fieldset>

        <footer className="filtros-dashboard__footer">
          <p className="filtros-dashboard__footer-hint">
            Os critérios serão aplicados ao consultar os dados.
          </p>

          <button
            type="button"
            className="filtros-dashboard__submit"
            onClick={onConsultar}
            disabled={loading}
          >
            {loading ? 'Consultando...' : 'Consultar dados'}
          </button>
        </footer>
      </div>
    </section>
  );
}

export default FiltrosDashboard;
