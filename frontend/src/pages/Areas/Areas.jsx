
import { useState } from 'react';

import FormularioAreas from '../../components/FormularioAreas/FormularioAreas';
import ResultadoAreas from '../../components/ResultadoAreas/ResultadoAreas';
import { consultarAreas } from '../../services/api';

function Areas() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  async function handleConsultar(notas) {
    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      const resposta = await consultarAreas(notas);
      setResultado(resposta.dados);
    } catch (error) {
      setErro(error?.message || 'Não foi possível realizar a análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <header>
        <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
          FILTRO 2
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Nota × Área do Conhecimento
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Compare seu desempenho nas áreas do ENEM, identifique seus pontos
          fortes e visualize como seus resultados se posicionam em relação à
          distribuição nacional.
        </p>
      </header>

      <section aria-labelledby="areas-form-title" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            01
          </span>
          <div>
            <h2 id="areas-form-title" className="font-semibold text-slate-900 dark:text-white">
              Informe suas notas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Preencha os dados solicitados para gerar sua análise.
            </p>
          </div>
        </div>

        <FormularioAreas onConsultar={handleConsultar} carregando={loading} />
      </section>

      {erro && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
          <span className="font-semibold text-red-800 dark:text-red-300">Não foi possível concluir a análise</span>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{erro}</p>
        </div>
      )}

      {resultado && (
        <section aria-label="Resultado da análise por área" className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                ANÁLISE CONCLUÍDA
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                Seu desempenho por área
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Consulte os percentis, compare as áreas e observe a dispersão entre seus resultados.
              </p>
            </div>
          </div>

          <ResultadoAreas resultado={resultado} />
        </section>
      )}
    </div>
  );
}

export default Areas;
