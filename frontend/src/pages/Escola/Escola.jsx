
import { useState } from 'react';

import { consultarEscola } from '../../services/api';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const NOTA_MIN = 0;
const NOTA_MAX = 1000;
const PADRAO_NOTA = /^\d{1,4}([.,]\d{1,2})?$/;

const CORES_CATEGORIA = {
  publica: 'bg-brand-600',
  privada: 'bg-amber-500',
};
const CORES_LEGENDA = {
  publica: 'bg-brand-600',
  privada: 'bg-amber-500',
};

function formatarNumero(valor, casas = 2) {
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(Number(valor))) {
    return '—';
  }
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function formatarInteiro(valor) {
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(Number(valor))) {
    return '—';
  }
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function validarCampos(estado, notaTexto) {
  const erros = {};

  if (!estado || !UFS.includes(estado)) {
    erros.estado = 'Selecione uma UF.';
  }

  const texto = notaTexto.trim();

  if (texto === '') {
    erros.nota = 'Informe sua nota de Matemática.';
  } else if (!PADRAO_NOTA.test(texto)) {
    erros.nota = 'Use apenas números, com até 2 casas decimais (ex.: 720,5).';
  } else {
    const valor = Number(texto.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < NOTA_MIN || valor > NOTA_MAX) {
      erros.nota = `A nota deve estar entre ${NOTA_MIN} e ${NOTA_MAX} pontos.`;
    }
  }

  return erros;
}

const cardClasses = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900';

function CartaoPercentil({ desempenho, uf, ano }) {
  if (!desempenho) return null;

  const valorPercentil = Number(desempenho.percentil_usuario);
  const percentilValido = Number.isFinite(valorPercentil);
  const largura = percentilValido ? Math.min(Math.max(valorPercentil, 0), 100) : 0;

  return (
    <article aria-labelledby="titulo-percentil" className={cardClasses}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-brand-600 dark:text-brand-400">
            ANÁLISE A · DESEMPENHO NA UF
          </p>
          <h2 id="titulo-percentil" className="mt-1 font-semibold text-slate-900 dark:text-white">
            Seu percentil em {desempenho.area_referencia} · {uf}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sua posição relativa entre as notas válidas de Matemática na unidade da Federação selecionada.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          ENEM {ano}
        </span>
      </header>

      <div className="mt-5 flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/60">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Seu percentil</span>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">{formatarNumero(desempenho.percentil_usuario)}</span>
            <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">º</span>
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Escala de 0 a 100</span>
        </div>

        <div className="sm:text-right">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nota informada</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatarNumero(desempenho.nota_usuario)}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">pontos em Matemática</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>0</span>
          <span>100</span>
        </div>
        <div
          role="progressbar"
          aria-label="Percentil da nota informada"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={largura}
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${largura}%` }} />
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        Cerca de <strong className="text-slate-900 dark:text-white">{formatarNumero(desempenho.percentil_usuario)}%</strong> das
        notas válidas de Matemática de quem fez a prova em {uf} são inferiores à sua. Notas iguais à sua contam pela metade.
      </p>

      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Base e metodologia</h3>
        <dl className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Base de comparação</dt>
            <dd className="text-slate-900 dark:text-white">
              {formatarInteiro(desempenho.total_notas_validas_uf)} notas válidas ({desempenho.variavel_nota})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Registros sem nota válida</dt>
            <dd className="text-slate-900 dark:text-white">{formatarInteiro(desempenho.registros_sem_nota_valida_uf)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500 dark:text-slate-400">Método</dt>
            <dd className="text-slate-900 dark:text-white">{desempenho.metodo_percentil} · Edição {ano}.</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function CartaoComposicao({ composicao, uf }) {
  if (!composicao) return null;

  const categorias = composicao.categorias ?? [];
  const excluidos = composicao.excluidos ?? [];

  const descricaoBarra = categorias
    .map((categoria) => `${categoria.rotulo}: ${formatarNumero(categoria.percentual_validos)}%`)
    .join('; ');

  return (
    <article aria-labelledby="titulo-composicao" className={cardClasses}>
      <header>
        <p className="text-xs font-bold tracking-wide text-brand-600 dark:text-brand-400">ANÁLISE B · PERFIL DA UF</p>
        <h2 id="titulo-composicao" className="mt-1 font-semibold text-slate-900 dark:text-white">
          Composição por tipo de escola · {uf}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Distribuição dos registros com dependência administrativa classificada como pública ou privada.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registros válidos</span>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatarInteiro(composicao.total_validos)}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Com escola identificada</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de registros da UF</span>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatarInteiro(composicao.total_registros_uf)}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Base agregada da unidade</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cobertura</span>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {composicao.cobertura == null ? '—' : `${formatarNumero(composicao.cobertura)}%`}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Parcela com classificação disponível</span>
        </div>
      </div>

      {!composicao.mapeamento_confirmado && (
        <div role="note" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <strong>Composição provisória.</strong> {composicao.fonte_mapeamento}
        </div>
      )}

      <div role="note" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
        A classificação usa a <strong className="text-slate-900 dark:text-white">dependência administrativa</strong> da escola de
        conclusão: pública (Federal, Estadual ou Municipal) e privada. A composição cobre apenas os registros com escola
        identificada no Censo Escolar. A cobertura indica essa parcela e não representa todos os inscritos ou presentes da UF.
      </div>

      <section className="mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white">Distribuição dos registros válidos</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Percentuais calculados sobre o total válido.</p>

        {categorias.length > 0 ? (
          <>
            <div
              role="img"
              aria-label={`Distribuição entre participantes válidos: ${descricaoBarra}`}
              className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              {categorias.map((categoria) => {
                const percentual = Number(categoria.percentual_validos);
                const largura = Number.isFinite(percentual) ? Math.min(Math.max(percentual, 0), 100) : 0;
                return (
                  <span
                    key={categoria.chave}
                    className={CORES_CATEGORIA[categoria.chave] ?? 'bg-slate-400'}
                    style={{ width: `${largura}%` }}
                  />
                );
              })}
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {categorias.map((categoria) => (
                <li key={categoria.chave} className="flex items-center gap-2 text-sm">
                  <span className={`size-2.5 rounded-full ${CORES_LEGENDA[categoria.chave] ?? 'bg-slate-400'}`} aria-hidden="true" />
                  <span className="text-slate-600 dark:text-slate-400">{categoria.rotulo}</span>
                  <strong className="text-slate-900 dark:text-white">{formatarNumero(categoria.percentual_validos)}%</strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Não há categorias válidas disponíveis para esta UF.</p>
        )}
      </section>

      <section className="mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white">Detalhamento por categoria</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Quantidade de registros e participação relativa na base.</p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">
              Quantidade e percentual de participantes por tipo de escola em {uf}
            </caption>
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-2.5">Categoria</th>
                <th scope="col" className="px-4 py-2.5">Participantes</th>
                <th scope="col" className="px-4 py-2.5">% dos válidos</th>
                <th scope="col" className="px-4 py-2.5">% do total da UF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categorias.map((categoria) => (
                <tr key={categoria.chave}>
                  <th scope="row" className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{categoria.rotulo}</th>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatarInteiro(categoria.quantidade)}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{formatarNumero(categoria.percentual_validos)}%</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatarNumero(categoria.percentual_total)}%</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold dark:bg-slate-800/60">
                <th scope="row" className="px-4 py-2.5 text-slate-900 dark:text-white">Total válido</th>
                <td className="px-4 py-2.5 text-slate-900 dark:text-white">{formatarInteiro(composicao.total_validos)}</td>
                <td className="px-4 py-2.5 text-slate-900 dark:text-white">100%</td>
                <td className="px-4 py-2.5 text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          * A soma dos percentuais exibidos pode diferir de 100% em até 0,01 ponto por arredondamento.
        </p>
      </section>

      <details className="mt-5 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-700 dark:text-slate-300">
          <span>Registros fora do denominador válido</span>
          <strong className="text-slate-900 dark:text-white">{formatarInteiro(composicao.total_excluidos)}</strong>
        </summary>

        {excluidos.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            {excluidos.map((item) => (
              <li key={`${item.chave}-${item.codigo ?? 'nulo'}`} className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{item.rotulo}</span>
                <span className="text-slate-900 dark:text-white">
                  {formatarInteiro(item.quantidade)}
                  <small className="ml-1 text-slate-500 dark:text-slate-500">({formatarNumero(item.percentual_total)}% do total)</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-slate-500 dark:text-slate-400">Não há detalhes de exclusão disponíveis.</p>
        )}
      </details>
    </article>
  );
}

const campoBase =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 ' +
  'dark:bg-slate-800 dark:text-white';
const campoNormal = 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-slate-700';
const campoErro = 'border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-700';

function Escola() {
  const [estado, setEstado] = useState('');
  const [nota, setNota] = useState('');
  const [errosCampos, setErrosCampos] = useState({});
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    const erros = validarCampos(estado, nota);
    setErrosCampos(erros);

    if (Object.keys(erros).length > 0) {
      return;
    }

    setResultado(null);
    setLoading(true);

    try {
      const resposta = await consultarEscola({
        estado,
        nota_matematica: Number(nota.trim().replace(',', '.')),
      });
      setResultado(resposta.dados);
    } catch (error) {
      setErro(error?.message || 'Não foi possível calcular a análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <header>
        <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400">
          FILTRO 4
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Tipo de escola: pública × privada
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Consulte sua posição relativa em Matemática na UF da prova e
          visualize, separadamente, a distribuição agregada das escolas de
          conclusão identificadas entre as redes pública e privada.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        <aside className={`h-fit ${cardClasses}`}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              01
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Parâmetros da consulta</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Todos os campos são obrigatórios.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="uf-escola" className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">
                Unidade da Federação
              </label>
              <span className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">UF onde você realizou a prova</span>

              <select
                id="uf-escola"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
                aria-invalid={Boolean(errosCampos.estado)}
                aria-describedby={errosCampos.estado ? 'erro-uf-escola' : undefined}
                className={`${campoBase} ${errosCampos.estado ? campoErro : campoNormal}`}
              >
                <option value="">Selecione a UF</option>
                {UFS.map((uf) => (
                  <option value={uf} key={uf}>{uf}</option>
                ))}
              </select>

              {errosCampos.estado && (
                <p id="erro-uf-escola" className="mt-1 text-xs text-red-600 dark:text-red-400">{errosCampos.estado}</p>
              )}
            </div>

            <div>
              <label htmlFor="nota-escola" className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">
                Sua nota de Matemática
              </label>

              <input
                id="nota-escola"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={nota}
                onChange={(event) => setNota(event.target.value)}
                placeholder="Ex.: 720,5"
                aria-invalid={Boolean(errosCampos.nota)}
                aria-describedby={errosCampos.nota ? 'erro-nota-escola ajuda-nota-escola' : 'ajuda-nota-escola'}
                className={`${campoBase} ${errosCampos.nota ? campoErro : campoNormal}`}
              />

              <p id="ajuda-nota-escola" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Informe um valor entre 0 e 1000 pontos.
              </p>

              {errosCampos.nota && (
                <p id="erro-nota-escola" className="mt-1 text-xs text-red-600 dark:text-red-400">{errosCampos.nota}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors
                hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? 'Calculando análise…' : 'Calcular análise'}
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Sobre esta consulta</h3>
            <p>Referência: microdados do ENEM 2025 (INEP). A UF considerada é a do local de prova.</p>
            <p>A composição por tipo de escola é um indicador agregado da UF, sem ligação individual com a nota informada.</p>
          </div>
        </aside>

        <section aria-live="polite" aria-busy={loading} className="space-y-6">
          {erro && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
              <strong className="text-red-800 dark:text-red-300">Não foi possível concluir a análise</strong>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">{erro}</p>
            </div>
          )}

          {!resultado && !erro && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                02
              </span>
              <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">Sua análise aparecerá aqui</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Escolha a UF e informe sua nota de Matemática para visualizar
                seu percentil e a composição por tipo de escola.
              </p>
            </div>
          )}

          {loading && (
            <div role="status" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="size-8 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 motion-reduce:animate-none dark:border-slate-700" />
              <div>
                <strong className="text-slate-900 dark:text-white">Calculando sua análise</strong>
                <p className="text-sm text-slate-500 dark:text-slate-400">Processando os dados de referência do ENEM 2025…</p>
              </div>
            </div>
          )}

          {resultado && (
            <>
              <div>
                <p className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400">ANÁLISE CONCLUÍDA</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Resultados da consulta</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Referência: {resultado.estado_referencia} · ENEM {resultado.ano_referencia}
                </p>
              </div>

              <CartaoPercentil desempenho={resultado.desempenho} uf={resultado.estado_referencia} ano={resultado.ano_referencia} />
              <CartaoComposicao composicao={resultado.composicao_escolar} uf={resultado.estado_referencia} />

              <aside className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Como interpretar</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {resultado.nota_metodologica} As duas análises não devem ser interpretadas como comparação de desempenho
                  entre escolas públicas e privadas.
                </p>
              </aside>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Escola;
