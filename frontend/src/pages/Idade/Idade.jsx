
import { useState } from 'react';
import { consultarFaixaEtaria } from '../../services/api';

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const campoClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-white';

function formatarNumero(valor, casas = 2) {
  if (valor == null || !Number.isFinite(Number(valor))) {
    return 'Indisponível';
  }
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: casas });
}

function Idade() {
  const [estado, setEstado] = useState('SC');
  const [nota, setNota] = useState('');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConsultar(event) {
    event.preventDefault();

    const notaNumerica = Number(nota);

    if (nota.trim() === '' || !Number.isFinite(notaNumerica) || notaNumerica < 0 || notaNumerica > 1000) {
      setErro('Informe uma nota válida entre 0 e 1000.');
      setResultado(null);
      return;
    }

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      const resposta = await consultarFaixaEtaria({ estado, nota_matematica: notaNumerica });
      setResultado(resposta?.dados ?? resposta);
    } catch (error) {
      setErro(error?.message || 'Não foi possível consultar os dados.');
    } finally {
      setLoading(false);
    }
  }

  const desempenho = resultado?.desempenho;
  const composicao = resultado?.composicao_etaria;
  const maiorQuantidade = composicao
    ? Math.max(...composicao.categorias.map((c) => c.quantidade), 1)
    : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <header>
        <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
          FILTRO 5
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Faixa etária
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Compare sua nota de Matemática com os participantes da mesma UF e
          veja a composição por faixa etária dos inscritos — são duas
          estatísticas independentes, sem correlação entre nota e idade.
        </p>
      </header>

      <form
        onSubmit={handleConsultar}
        className="mt-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm
          sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end
          dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label htmlFor="idade-estado" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Estado (UF)
          </label>
          <select id="idade-estado" className={campoClasses} value={estado} onChange={(e) => setEstado(e.target.value)}>
            {estadosBrasil.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="idade-nota" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Sua nota em Matemática
          </label>
          <input
            id="idade-nota"
            type="number"
            min="0"
            max="1000"
            step="any"
            placeholder="Ex.: 700"
            className={campoClasses}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors
            hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {erro && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
          <strong className="text-red-800 dark:text-red-300">Não foi possível realizar a consulta</strong>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{erro}</p>
        </div>
      )}

      {loading && (
        <p role="status" className="mt-6 text-slate-500 dark:text-slate-400">
          Calculando os indicadores...
        </p>
      )}

      {resultado && !loading && (
        <div aria-live="polite" className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resultado da análise</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {resultado.estado_referencia} · ENEM {resultado.ano_referencia}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Percentil (Matemática)</span>
              <strong className="mt-2 block text-3xl font-bold text-slate-900 dark:text-white">
                {formatarNumero(desempenho.percentil_usuario)}%
              </strong>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sua posição entre as notas válidas da UF.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Z-Score</span>
              <strong className="mt-2 block text-3xl font-bold text-slate-900 dark:text-white">
                {desempenho.zscore_usuario == null ? '—' : formatarNumero(desempenho.zscore_usuario, 4)}
              </strong>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {desempenho.observacao_zscore || 'Distância em desvios-padrão em relação à média da UF.'}
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Composição por faixa etária — {resultado.estado_referencia}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatarNumero(composicao.total_validos, 0)} de {formatarNumero(composicao.total_inscritos, 0)} inscritos com faixa etária classificada.
            </p>

            <ul className="mt-5 space-y-3">
              {composicao.categorias
                .filter((c) => c.quantidade > 0)
                .map((categoria) => (
                  <li key={categoria.codigo}>
                    <div className="mb-1 flex justify-between text-sm text-slate-700 dark:text-slate-300">
                      <span>{categoria.rotulo}</span>
                      <span className="font-medium">{formatarNumero(categoria.percentual_validos)}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
                        style={{ width: `${(categoria.quantidade / maiorQuantidade) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-500">
            {resultado.nota_metodologica}
          </p>
        </div>
      )}
    </div>
  );
}

export default Idade;
