
import MapaBrasil from '../MapaInterativo/MapaBrasil';

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
  'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const campoSelectClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-sm font-semibold ' +
  'text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-white';

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
    setEstados((atuais) => atuais.filter((item) => item !== estado));
  }

  const estadosResumo = [...estados].sort(
    (a, b) => estadosBrasil.indexOf(a) - estadosBrasil.indexOf(b),
  );

  return (
    <section className="space-y-6">
      <div
        aria-label="Filtros da consulta"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Filtros selecionados
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="filtro-ano"
              className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Ano
            </label>

            <select
              id="filtro-ano"
              className={campoSelectClasses}
              value={ano}
              onChange={(event) => setAno(event.target.value)}
            >
              {/* Anos com microdados ingeridos (#17) -- ver core/genero.py
                  ANOS_DISPONIVEIS. Listar só esses evita oferecer uma opção
                  que a API sempre rejeitaria com erro. */}
              {[2025, 2024].map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Estados
              </span>

              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {estados.length} selecionado(s)
              </span>
            </div>

            {estadosResumo.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {estadosResumo.slice(0, 5).map((estado) => (
                  <button
                    type="button"
                    key={estado}
                    onClick={() => removerEstado(estado)}
                    aria-label={`Remover ${estado} da seleção`}
                    title={`Remover ${estado}`}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    {estado}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}

                {estadosResumo.length > 5 && (
                  <span className="inline-flex items-center px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    +{estadosResumo.length - 5}
                  </span>
                )}
              </div>
            ) : (
              <span className="mt-2 block text-xs text-slate-400 dark:text-slate-500">
                Nenhum estado selecionado
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="filtro-nota-matematica"
              className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Nota Matemática
            </label>

            <input
              id="filtro-nota-matematica"
              className={campoSelectClasses}
              type="number"
              min="0"
              max="1000"
              step="1"
              placeholder="Qualquer nota"
              value={notaMatematica}
              onChange={(event) => setNotaMatematica(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Seleção de estados
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Escolha no mapa as UFs que deseja incluir na análise.
        </p>

        <div className="mt-4">
          <MapaBrasil estados={estados} setEstados={setEstados} />
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {estados.length === 0
            ? 'Selecione ao menos um estado para realizar a consulta.'
            : `${estados.length} estado(s) selecionado(s) para a consulta.`}
        </p>

        <button
          type="button"
          onClick={onConsultar}
          disabled={loading || estados.length === 0}
          className="w-full rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors
            hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? 'Consultando...' : 'Consultar dados'}
        </button>
      </div>
    </section>
  );
}

export default FiltrosDashboard;
