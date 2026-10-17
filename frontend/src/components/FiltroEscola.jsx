import { useState } from 'react'
import { consultarEscola } from '../services/api'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const NOTA_MIN = 0
const NOTA_MAX = 1000
// Aceita "720", "720.5" ou "720,5" (até 2 casas decimais).
const PADRAO_NOTA = /^\d{1,4}([.,]\d{1,2})?$/

const CORES_CATEGORIA = {
  publica: 'bg-blue-600',
  privada: 'bg-amber-500',
}

function formatarNumero(valor, casas = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function formatarInteiro(valor) {
  return Number(valor).toLocaleString('pt-BR')
}

function validarCampos(estado, notaTexto) {
  const erros = {}
  if (!estado || !UFS.includes(estado)) {
    erros.estado = 'Selecione uma UF.'
  }
  const texto = notaTexto.trim()
  if (texto === '') {
    erros.nota = 'Informe sua nota de Matemática.'
  } else if (!PADRAO_NOTA.test(texto)) {
    erros.nota = 'Use apenas números, com até 2 casas decimais (ex.: 720,5).'
  } else {
    const valor = Number(texto.replace(',', '.'))
    if (!Number.isFinite(valor) || valor < NOTA_MIN || valor > NOTA_MAX) {
      erros.nota = `A nota deve estar entre ${NOTA_MIN} e ${NOTA_MAX} pontos.`
    }
  }
  return erros
}

function CartaoPercentil({ desempenho, uf, ano }) {
  const percentil = Number(desempenho.percentil_usuario)
  const largura = Math.min(Math.max(percentil, 0), 100)

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="titulo-percentil">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Análise A · Desempenho na UF</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="titulo-percentil" className="text-sm font-medium text-slate-500">
            Seu percentil em {desempenho.area_referencia} · {uf}
          </h2>
          <p className="mt-2 text-5xl font-bold text-blue-700">
            {formatarNumero(percentil)}
            <span className="ml-1 text-2xl font-semibold">º</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">Nota informada</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatarNumero(desempenho.nota_usuario)}</p>
        </div>
      </div>

      <div className="mt-5" aria-hidden="true">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>100</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${largura}%` }} />
        </div>
      </div>

      <p className="mt-4 text-slate-700">
        Cerca de <strong>{formatarNumero(percentil)}%</strong> das notas válidas de Matemática de quem fez a prova
        em {uf} são inferiores à sua (notas iguais à sua contam pela metade).
      </p>
      <dl className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
        <div>
          <dt className="inline">Base de comparação: </dt>
          <dd className="inline">{formatarInteiro(desempenho.total_notas_validas_uf)} notas válidas ({desempenho.variavel_nota})</dd>
        </div>
        <div>
          <dt className="inline">Registros sem nota válida (fora da base): </dt>
          <dd className="inline">{formatarInteiro(desempenho.registros_sem_nota_valida_uf)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline">Método: </dt>
          <dd className="inline">{desempenho.metodo_percentil} Edição {ano}.</dd>
        </div>
      </dl>
    </article>
  )
}

function CartaoComposicao({ composicao, uf }) {
  const { categorias, excluidos } = composicao
  const descricaoBarra = categorias
    .map((c) => `${c.rotulo}: ${formatarNumero(c.percentual_validos)}%`)
    .join('; ')

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6" aria-labelledby="titulo-composicao">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Análise B · Perfil dos participantes da UF</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-composicao" className="text-xl font-semibold text-slate-900">
            Composição por tipo de escola · {uf}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Percentuais calculados sobre os registros com dependência administrativa classificada (pública ou privada).
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Válidos: <strong>{formatarInteiro(composicao.total_validos)}</strong> de{' '}
          {formatarInteiro(composicao.total_registros_uf)} registros
          {composicao.cobertura !== null && composicao.cobertura !== undefined && (
            <> · cobertura <strong>{formatarNumero(composicao.cobertura)}%</strong></>
          )}
        </p>
      </div>

      {!composicao.mapeamento_confirmado && (
        <div role="note" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Composição provisória:</strong> {composicao.fonte_mapeamento}
        </div>
      )}

      <div role="note" className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
        A composição usa a <strong>dependência administrativa</strong> da escola de conclusão
        (pública = Federal/Estadual/Municipal; privada = Privada). Ela cobre apenas os registros
        com escola identificada no Censo Escolar — a <strong>cobertura</strong> de{' '}
        {formatarNumero(composicao.cobertura)}% indica essa parcela e não representa todos os inscritos ou presentes da UF.
      </div>

      <div className="mt-5">
        <div
          role="img"
          aria-label={`Distribuição entre os participantes válidos — ${descricaoBarra}`}
          className="flex h-6 w-full overflow-hidden rounded-full bg-slate-200"
        >
          {categorias.map((c) => (
            <div
              key={c.chave}
              className={`${CORES_CATEGORIA[c.chave] || 'bg-slate-500'} h-full`}
              style={{ width: `${Number(c.percentual_validos) || 0}%` }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600" aria-hidden="true">
          {categorias.map((c) => (
            <li key={c.chave} className="flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-sm ${CORES_CATEGORIA[c.chave] || 'bg-slate-500'}`} />
              {c.rotulo}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="sr-only">Quantidade e percentual de participantes por tipo de escola em {uf}</caption>
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4">Categoria</th>
              <th scope="col" className="py-2 pr-4 text-right">Participantes</th>
              <th scope="col" className="py-2 pr-4 text-right">% dos válidos</th>
              <th scope="col" className="py-2 text-right">% do total da UF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {categorias.map((c) => (
              <tr key={c.chave}>
                <th scope="row" className="px-3 py-2 font-medium text-slate-800">{c.rotulo}</th>
                <td className="py-2 pr-4 text-right">{formatarInteiro(c.quantidade)}</td>
                <td className="py-2 pr-4 text-right font-semibold">{formatarNumero(c.percentual_validos)}%</td>
                <td className="py-2 pr-3 text-right text-slate-500">{formatarNumero(c.percentual_total)}%</td>
              </tr>
            ))}
            <tr className="bg-slate-100">
              <th scope="row" className="px-3 py-2 font-semibold text-slate-800">Total válido</th>
              <td className="py-2 pr-4 text-right font-semibold">{formatarInteiro(composicao.total_validos)}</td>
              <td className="py-2 pr-4 text-right">100%*</td>
              <td className="py-2 pr-3 text-right text-slate-500">—</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-xs text-slate-500">* A soma dos percentuais exibidos pode diferir de 100% em até 0,01 ponto por arredondamento.</p>
      </div>

      <details className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Registros fora do denominador válido: {formatarInteiro(composicao.total_excluidos)}
        </summary>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {excluidos.map((e) => (
            <li key={`${e.chave}-${e.codigo ?? 'nulo'}`} className="flex justify-between gap-4">
              <span>{e.rotulo}</span>
              <span>
                {formatarInteiro(e.quantidade)}{' '}
                <span className="text-slate-400">({formatarNumero(e.percentual_total)}% do total)</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  )
}

function FiltroEscola() {
  const [estado, setEstado] = useState('')
  const [nota, setNota] = useState('')
  const [errosCampos, setErrosCampos] = useState({})
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErro('')

    const erros = validarCampos(estado, nota)
    setErrosCampos(erros)
    if (Object.keys(erros).length > 0) return

    setResultado(null)
    setLoading(true)
    try {
      const resposta = await consultarEscola({
        estado,
        nota_matematica: Number(nota.trim().replace(',', '.')),
      })
      setResultado(resposta.dados)
    } catch (error) {
      setErro(error.message)
    } finally {
      setLoading(false)
    }
  }

  const classeCampo = (temErro) =>
    `w-full rounded-lg border bg-white p-3 text-slate-900 outline-none focus:ring-2 ${
      temErro ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
    }`

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="font-semibold text-blue-600">Filtro 4 · Tipo de escola</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Tipo de escola: pública × privada
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Veja a posição da sua nota de Matemática entre os participantes presentes na prova na mesma UF e,
          separadamente, como as escolas de conclusão identificadas se distribuem entre rede pública e privada
          (dependência administrativa, ENEM 2025).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <section className="h-fit rounded-2xl bg-white p-6 shadow-sm" aria-labelledby="titulo-parametros">
          <h2 id="titulo-parametros" className="text-lg font-semibold text-slate-900">Parâmetros da consulta</h2>
          <p className="mt-1 text-sm text-slate-500">Todos os campos são obrigatórios.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
            <div>
              <label htmlFor="uf-escola" className="mb-2 block text-sm font-medium text-slate-700">
                Unidade da Federação (UF da prova)
              </label>
              <select
                id="uf-escola"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
                aria-invalid={Boolean(errosCampos.estado)}
                aria-describedby={errosCampos.estado ? 'erro-uf-escola' : undefined}
                className={classeCampo(errosCampos.estado)}
              >
                <option value="">Selecione a UF</option>
                {UFS.map((uf) => <option value={uf} key={uf}>{uf}</option>)}
              </select>
              {errosCampos.estado && (
                <p id="erro-uf-escola" className="mt-1 text-xs text-red-700">{errosCampos.estado}</p>
              )}
            </div>

            <div>
              <label htmlFor="nota-escola" className="mb-2 block text-sm font-medium text-slate-700">
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
                className={classeCampo(errosCampos.nota)}
              />
              <p id="ajuda-nota-escola" className="mt-1 text-xs text-slate-500">Valor entre 0 e 1000 pontos.</p>
              {errosCampos.nota && (
                <p id="erro-nota-escola" className="mt-1 text-xs text-red-700">{errosCampos.nota}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Calculando…' : 'Calcular análise'}
            </button>
          </form>

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            Referência: microdados do ENEM 2025 (INEP). A UF considerada é a do local de prova. A composição por tipo
            de escola é um indicador agregado da UF, não uma característica ligada à nota informada.
          </p>
        </section>

        <section aria-live="polite" aria-busy={loading} className="space-y-6">
          {erro && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {erro}
            </div>
          )}

          {!resultado && !erro && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="font-semibold text-slate-800">Sua análise aparecerá aqui</h2>
              <p className="mt-2 text-sm text-slate-500">
                Escolha a UF e informe sua nota de Matemática para ver seu percentil e a distribuição por tipo de escola.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-xl bg-blue-50 p-4 text-blue-800">Calculando com os dados de referência do ENEM 2025…</div>
          )}

          {resultado && (
            <>
              <CartaoPercentil
                desempenho={resultado.desempenho}
                uf={resultado.estado_referencia}
                ano={resultado.ano_referencia}
              />
              <CartaoComposicao composicao={resultado.composicao_escolar} uf={resultado.estado_referencia} />
              <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <strong>Como interpretar:</strong> {resultado.nota_metodologica} As duas análises acima não devem ser
                lidas como comparação de desempenho entre escolas públicas e privadas.
              </aside>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default FiltroEscola
