function ResultadoGenero({
  resultado,
  loading,
  erro,
}) {
  // LOADING
  if (loading) {
    return (
      <div className="rounded-lg bg-blue-50 p-4 text-blue-700">
        Consultando dados...
      </div>
    )
  }

  // ERRO
  if (erro) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        {erro}
      </div>
    )
  }

  // ESTADO VAZIO
  if (!resultado) {
    return (
      <div className="rounded-lg bg-slate-50 p-6 text-center">
        <p className="font-medium text-slate-700">
          Faça sua consulta
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Preencha os filtros ao lado e clique em Consultar
          para visualizar sua posição em relação ao grupo selecionado.
        </p>
      </div>
    )
  }

  const percentil = Number(resultado.percentil_usuario)
  const mediaGrupo = Number(resultado.media_grupo_filtrado)

  // Garante que a barra fique entre 0% e 100%
  const percentualBarra = Math.min(
    Math.max(percentil, 0),
    100
  )

  return (
    <div className="space-y-6">

      {/* PERCENTIL */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">

        <p className="text-sm font-medium text-slate-500">
          Sua posição
        </p>

        <div className="mt-2 flex items-end gap-2">

          <span className="text-4xl font-bold text-blue-600">
            {percentil}
          </span>

          <span className="mb-1 text-slate-500">
            º percentil
          </span>

        </div>

        <p className="mt-3 text-slate-700">
          Você está no percentil{' '}
          <strong>{percentil}</strong> do grupo filtrado.
        </p>

        {/* BARRA */}
        <div className="mt-5">

          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>0</span>
            <span>100</span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">

            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${percentualBarra}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* MÉDIA DO GRUPO */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">

        <p className="text-sm font-medium text-slate-500">
          Média do grupo filtrado
        </p>

        <p className="mt-2 text-3xl font-bold text-slate-900">
          {mediaGrupo.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          pontos em Matemática
        </p>

      </div>

    </div>
  )
}

export default ResultadoGenero