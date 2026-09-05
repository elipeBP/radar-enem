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
}) {

  function handleEstadosChange(event) {
    const estadosSelecionados = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    )

    setEstados(estadosSelecionados)
  }

  return (
    <aside className="w-full bg-slate-900 p-6 text-white md:min-h-screen md:w-80">

      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Radar ENEM
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Análise de desigualdades educacionais
        </p>
      </div>

      <div className="space-y-6">

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
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="estados"
            className="mb-2 block text-sm font-medium"
          >
            Estados
          </label>

          <select
            id="estados"
            multiple
            value={estados}
            onChange={handleEstadosChange}
            className="h-48 w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          >
            {estadosBrasil.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-slate-400">
            Use Ctrl para selecionar vários estados.
          </p>
        </div>

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
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          />
        </div>

      </div>

    </aside>
  )
}

export default Sidebar