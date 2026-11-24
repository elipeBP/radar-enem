
function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(numero)
    : String(valor);
}

function interpretarDesvio(desvio) {
  const valor = Number(desvio);

  if (desvio === null || desvio === undefined || desvio === '' || !Number.isFinite(valor)) {
    return {
      titulo: 'Interpretação indisponível',
      descricao: 'Não há informação suficiente para interpretar a dispersão entre as áreas.',
    };
  }

  if (valor <= 5) {
    return {
      titulo: 'Perfil bastante equilibrado',
      descricao: 'Seus percentis estão próximos entre si, indicando desempenho relativo consistente entre as áreas.',
    };
  }

  if (valor <= 10) {
    return {
      titulo: 'Perfil moderadamente equilibrado',
      descricao: 'Há algumas diferenças entre seus desempenhos relativos, mas sem grande dispersão entre as áreas.',
    };
  }

  return {
    titulo: 'Perfil com diferenças mais marcantes',
    descricao: 'Seus percentis apresentam maior dispersão, indicando áreas de destaque e outras relativamente mais distantes.',
  };
}

function ResultadoAreas({ resultado }) {
  if (!resultado) {
    return null;
  }

  const { areas = [], area_mais_forte, area_mais_fraca, desvio_padrao_percentis } = resultado;
  const interpretacaoDesvio = interpretarDesvio(desvio_padrao_percentis);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Desempenho por área</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Percentil em relação à distribuição nacional do ENEM 2025.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Percentis</span>
        </header>

        {areas.length > 0 ? (
          <div className="mt-5 space-y-4">
            {areas.map((item) => {
              const numeroPercentil = Number(item.percentil);
              const percentilLimitado = Number.isFinite(numeroPercentil)
                ? Math.min(100, Math.max(0, numeroPercentil))
                : 0;

              return (
                <article key={item.area}>
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-medium text-slate-900 dark:text-white">{item.area}</h4>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Percentil {formatarValor(item.percentil)}
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-label={`Percentil em ${item.area}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentilLimitado}
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                    <div
                      className="h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${percentilLimitado}%` }}
                    />
                  </div>

                  <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Nota obtida</span>
                    <strong className="text-slate-700 dark:text-slate-300">{formatarValor(item.nota)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Não há resultados por área disponíveis para esta consulta.
          </p>
        )}
      </section>

      <section aria-label="Resumo do desempenho" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 border-t-4 border-t-brand-600 bg-white p-5 shadow-sm dark:border-slate-800 dark:border-t-brand-500 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Melhor desempenho relativo</span>
          <h3 className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">{area_mais_forte || '—'}</h3>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Área com maior destaque relativo na análise.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Menor desempenho relativo</span>
          <h3 className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">{area_mais_fraca || '—'}</h3>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Área que merece atenção na comparação entre resultados.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 border-t-4 border-t-slate-400 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dispersão entre percentis</span>
          <h3 className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
            {formatarValor(desvio_padrao_percentis)}
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">{interpretacaoDesvio.titulo}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{interpretacaoDesvio.descricao}</p>
        </article>
      </section>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        A comparação por percentis representa uma posição relativa na distribuição
        utilizada. Ela não corresponde diretamente à porcentagem de questões acertadas.
      </p>
    </div>
  );
}

export default ResultadoAreas;
