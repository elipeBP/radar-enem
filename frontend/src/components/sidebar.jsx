const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
  'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

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
  function toggleEstado(uf) {
    if (estados.includes(uf)) {
      setEstados(
        estados.filter((estado) => estado !== uf)
      )
    } else {
      setEstados([
        ...estados,
        uf,
      ])
    }
  }

  function selecionarTodosEstados() {
    setEstados(estadosBrasil)
  }

  function limparEstados() {
    setEstados([])
  }

  return (
    <aside className="w-full bg-slate-900 p-6 text-white md:min-h-screen md:w-80">

      {/* TÍTULO */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Radar ENEM
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Análise de desigualdades educacionais
        </p>
      </div>

      <div className="space-y-6">

        {/* ANO */}
        <div>
          <label
            htmlFor="ano"
            className="mb-2 block text-sm font-medium"
          >
            Ano
          </label>

          <select
            id="ano"
            value={ano}
            onChange={(event) => setAno(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 outline-none focus:border-blue-500"
          >
            <option value="2024">
              2024
            </option>

            <option value="2025">
              2025
            </option>
          </select>
        </div>

        {/* ESTADOS */}
        <div>
          <div className="mb-2 flex items-center justify-between">

            <label className="block text-sm font-medium">
              Estados
            </label>

            <span className="text-xs text-slate-400">
              {estados.length} selecionado(s)
            </span>

          </div>

          {/* AÇÕES */}
          <div className="mb-3 flex gap-2">

            <button
              type="button"
              onClick={selecionarTodosEstados}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-600"
            >
              Selecionar todos
            </button>

            <button
              type="button"
              onClick={limparEstados}
              disabled={estados.length === 0}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar
            </button>

          </div>

          {/* CHECKBOXES */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 p-3">

            <div className="grid grid-cols-3 gap-2">

              {estadosBrasil.map((uf) => (
                <label
                  key={uf}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition hover:bg-slate-700"
                >

                  <input
                    type="checkbox"
                    value={uf}
                    checked={estados.includes(uf)}
                    onChange={() => toggleEstado(uf)}
                    className="h-4 w-4 cursor-pointer accent-blue-600"
                  />

                  <span className="text-sm text-white">
                    {uf}
                  </span>

                </label>
              ))}

            </div>

          </div>

          <p className="mt-2 text-xs text-slate-400">
            Selecione um ou mais estados.
          </p>
        </div>

        {/* NOTA MATEMÁTICA */}
        <div>
          <label
            htmlFor="nota"
            className="mb-2 block text-sm font-medium"
          >
            Nota Matemática
          </label>

          <input
            id="nota"
            type="number"
            min="0"
            max="1000"
            placeholder="Ex.: 650"
            value={notaMatematica}
            onChange={(event) =>
              setNotaMatematica(event.target.value)
            }
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* BOTÃO CONSULTAR */}
        <button
          type="button"
          onClick={onConsultar}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Consultando...'
            : 'Consultar'}
        </button>

      </div>

    </aside>
  )
}

export default Sidebar