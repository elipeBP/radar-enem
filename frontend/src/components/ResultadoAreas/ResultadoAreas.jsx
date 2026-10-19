export default function ResultadoAreas({ resultado }) {
  if (!resultado) {
    return null
  }

  const {
    areas,
    area_mais_forte,
    area_mais_fraca,
    desvio_padrao_percentis,
  } = resultado

  const interpretacaoDesvio = interpretarDesvio(
    desvio_padrao_percentis
  )

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Resultado da análise
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Percentil em relação à distribuição nacional do ENEM 2025.
        </p>
      </div>

      <div className="space-y-4">
        {areas.map((item) => (
          <div key={item.area}>
            <div className="flex justify-between mb-1">
              <span className="font-medium">
                {item.area}
              </span>

              <span className="text-sm">
                Percentil {item.percentil}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{ width: `${item.percentil}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Nota: {item.nota}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">
            Área relativamente mais forte
          </p>

          <p className="font-semibold mt-1">
            {area_mais_forte}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">
            Área relativamente mais fraca
          </p>

          <p className="font-semibold mt-1">
            {area_mais_fraca}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">
            Equilíbrio entre as áreas
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {desvio_padrao_percentis}
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {interpretacaoDesvio.titulo}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {interpretacaoDesvio.descricao}
          </p>
        </div>
      </div>
    </div>
  )
}

function interpretarDesvio(desvio) {
  if (desvio <= 5) {
    return {
      titulo: 'Perfil bastante equilibrado',
      descricao:
        'Seus percentis estão próximos entre si, indicando desempenho relativo consistente entre as áreas.',
    }
  }

  if (desvio <= 10) {
    return {
      titulo: 'Perfil moderadamente equilibrado',
      descricao:
        'Há algumas diferenças entre seus desempenhos relativos, mas sem grande dispersão entre as áreas.',
    }
  }

  return {
    titulo: 'Perfil com diferenças mais marcantes',
    descricao:
      'Seus percentis apresentam maior dispersão, indicando áreas de destaque e outras relativamente mais distantes.',
  }
}