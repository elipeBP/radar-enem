
import './styles-sidebar/Sidebar.css';

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
  'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function Sidebar({
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
    <aside className="sidebar">
      <header className="sidebar__header">
        <h2 className="sidebar__title">Filtros</h2>
        <p className="sidebar__description">
          Configure os critérios para consultar os dados do ENEM.
        </p>
      </header>

      <div className="sidebar__filters">
        <div className="sidebar__field">
          <label className="sidebar__label" htmlFor="filtro-ano">
            Ano do ENEM
          </label>

          <select
            id="filtro-ano"
            className="sidebar__input"
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

        <div className="sidebar__field">
          <div className="sidebar__states-header">
            <span className="sidebar__label">Estados</span>
            <span className="sidebar__counter">
              {estados.length} selecionado(s)
            </span>
          </div>

          <div className="sidebar__actions">
            <button
              type="button"
              className="sidebar__action-button"
              onClick={() => setEstados([...estadosBrasil])}
            >
              Selecionar todos
            </button>

            <button
              type="button"
              className="sidebar__action-button"
              onClick={() => setEstados([])}
            >
              Limpar
            </button>
          </div>

          <div className="sidebar__states-grid">
            {estadosBrasil.map((estado) => (
              <label key={estado} className="sidebar__state-option">
                <input
                  className="sidebar__checkbox"
                  type="checkbox"
                  checked={estados.includes(estado)}
                  onChange={() => alternarEstado(estado)}
                />
                <span>{estado}</span>
              </label>
            ))}
          </div>

          <p className="sidebar__hint">
            Selecione um ou mais estados para filtrar a consulta.
          </p>
        </div>

        <div className="sidebar__field">
          <label
            className="sidebar__label"
            htmlFor="filtro-nota-matematica"
          >
            Nota mínima em Matemática
          </label>

          <input
            id="filtro-nota-matematica"
            className="sidebar__input"
            type="number"
            min="0"
            max="1000"
            step="1"
            placeholder="Ex.: 700"
            value={notaMatematica}
            onChange={(event) => setNotaMatematica(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="sidebar__submit"
          onClick={onConsultar}
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Consultar dados'}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

