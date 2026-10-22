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
            Configure o ano, os estados e a nota mínima para analisar
            os dados do ENEM.
          </p>
        </div>
      </header>

      <div className="filtros-dashboard__fields">
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
          <div className="filtros-dashboard__states-header">
            <span className="filtros-dashboard__label">Estados</span>

            <span className="filtros-dashboard__counter">
              {estados.length} selecionado(s)
            </span>
          </div>

          <div className="filtros-dashboard__actions">
            <button
              type="button"
              className="filtros-dashboard__action-button"
              onClick={() => setEstados([...estadosBrasil])}
            >
              Selecionar todos
            </button>

            <button
              type="button"
              className="filtros-dashboard__action-button"
              onClick={() => setEstados([])}
            >
              Limpar
            </button>
          </div>

          <div className="filtros-dashboard__states-grid">
            {estadosBrasil.map((estado) => (
              <label
                key={estado}
                className="filtros-dashboard__state-option"
              >
                <input
                  className="filtros-dashboard__checkbox"
                  type="checkbox"
                  checked={estados.includes(estado)}
                  onChange={() => alternarEstado(estado)}
                />

                <span>{estado}</span>
              </label>
            ))}
          </div>

          <p className="filtros-dashboard__hint">
            Selecione um ou mais estados para filtrar a consulta.
          </p>
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

        <button
          type="button"
          className="filtros-dashboard__submit"
          onClick={onConsultar}
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Consultar dados'}
        </button>
      </div>
    </section>
  );
}

export default FiltrosDashboard;