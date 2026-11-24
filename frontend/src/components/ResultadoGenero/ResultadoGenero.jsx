
function ResultadoGenero({ resultado, loading, error }) {
  if (loading) {
    return (
      <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Consultando os dados...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/40">
        <h3 className="font-semibold text-red-800 dark:text-red-300">
          Não foi possível consultar os dados
        </h3>
        <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!resultado) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Nenhuma consulta realizada
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure os filtros e clique em Consultar dados para visualizar os
          resultados.
        </p>
      </section>
    );
  }

  const percentil = Number(resultado.percentil_usuario ?? 0);
  const mediaGrupo = resultado.media_grupo_filtrado;

  const percentilValido = Number.isFinite(percentil)
    ? Math.min(100, Math.max(0, percentil))
    : 0;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Percentil do usuário
        </span>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">
            {percentilValido.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </span>
          <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">º</span>
        </div>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seu desempenho em relação ao grupo filtrado.
        </p>

        <div
          role="progressbar"
          aria-label="Percentil do usuário"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentilValido}
          className="mt-4"
        >
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>0</span>
            <span>100</span>
          </div>

          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${percentilValido}%` }}
            />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Média do grupo filtrado
        </span>

        <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-white">
          {mediaGrupo == null
            ? '—'
            : Number.isFinite(Number(mediaGrupo))
              ? Number(mediaGrupo).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
              : '—'}
        </p>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Média calculada para os critérios selecionados.
        </p>
      </article>
    </section>
  );
}

export default ResultadoGenero;
