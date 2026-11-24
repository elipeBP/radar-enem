
import { useState } from 'react';
import { consultarNotaUF } from '../../services/api';

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const areasEnem = [
  { valor: 'CN', nome: 'Ciências da Natureza' },
  { valor: 'CH', nome: 'Ciências Humanas' },
  { valor: 'LC', nome: 'Linguagens' },
  { valor: 'MT', nome: 'Matemática' },
  { valor: 'REDACAO', nome: 'Redação' },
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

function NotaUF() {
  const [estado, setEstado] = useState('SC');
  const [area, setArea] = useState('MT');
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
      const resposta = await consultarNotaUF({ estado, area, nota: notaNumerica });
      setResultado(resposta?.dados ?? resposta);
    } catch (error) {
      setErro(error?.message || 'Não foi possível consultar os dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <header>
        <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
          FILTRO 1
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Nota × Estado
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Compare sua nota com os resultados de participantes da mesma
          unidade federativa e área do ENEM.
        </p>
      </header>

      <form
        onSubmit={handleConsultar}
        className="mt-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm
          sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_auto] lg:items-end
          dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label htmlFor="nota-uf-estado" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Estado (UF)
          </label>
          <select id="nota-uf-estado" className={campoClasses} value={estado} onChange={(e) => setEstado(e.target.value)}>
            {estadosBrasil.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nota-uf-area" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Área do conhecimento
          </label>
          <select id="nota-uf-area" className={campoClasses} value={area} onChange={(e) => setArea(e.target.value)}>
            {areasEnem.map((item) => (
              <option key={item.valor} value={item.valor}>{item.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nota-uf-nota" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Sua nota
          </label>
          <input
            id="nota-uf-nota"
            type="number"
            min="0"
            max="1000"
            step="any"
            placeholder="Ex.: 720"
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
          {loading ? 'Consultando...' : 'Consultar nota'}
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
              {resultado.area_descricao} · {resultado.estado_referencia} · ENEM {resultado.ano_referencia}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Percentil</span>
              <strong className="mt-2 block text-3xl font-bold text-slate-900 dark:text-white">
                {formatarNumero(resultado.percentil_usuario)}%
              </strong>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sua posição relativa na distribuição de notas válidas do recorte selecionado.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Z-Score</span>
              <strong className="mt-2 block text-3xl font-bold text-slate-900 dark:text-white">
                {resultado.zscore_usuario == null ? '—' : formatarNumero(resultado.zscore_usuario, 4)}
              </strong>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Distância em desvios-padrão em relação à média do recorte.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Média da UF</span>
              <strong className="mt-2 block text-3xl font-bold text-slate-900 dark:text-white">
                {formatarNumero(resultado.media_uf)}
              </strong>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Média das notas válidas utilizadas na comparação.
              </p>
            </article>
          </div>

          <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p><strong className="text-slate-900 dark:text-white">Sua nota:</strong> {formatarNumero(resultado.nota_usuario)}</p>
            <p><strong className="text-slate-900 dark:text-white">Notas comparadas:</strong> {formatarNumero(resultado.total_notas_validas, 0)}</p>
            {resultado.observacao_zscore && <p>{resultado.observacao_zscore}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-500">{resultado.criterio_populacao}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotaUF;
