
import { useState } from 'react';

import { consultarEscola } from '../../services/api';

import './styles-escola/Escola.css';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const NOTA_MIN = 0;
const NOTA_MAX = 1000;
const PADRAO_NOTA = /^\d{1,4}([.,]\d{1,2})?$/;

const CLASSES_CATEGORIA = {
  publica: 'escola-composicao__segment--publica',
  privada: 'escola-composicao__segment--privada',
};

function formatarNumero(valor, casas = 2) {
  if (
    valor === null ||
    valor === undefined ||
    valor === '' ||
    !Number.isFinite(Number(valor))
  ) {
    return '—';
  }

  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarInteiro(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === '' ||
    !Number.isFinite(Number(valor))
  ) {
    return '—';
  }

  return Number(valor).toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
  });
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
    erros.nota =
      'Use apenas números, com até 2 casas decimais (ex.: 720,5).';
  } else {
    const valor = Number(texto.replace(',', '.'));

    if (
      !Number.isFinite(valor) ||
      valor < NOTA_MIN ||
      valor > NOTA_MAX
    ) {
      erros.nota =
        `A nota deve estar entre ${NOTA_MIN} e ${NOTA_MAX} pontos.`;
    }
  }

  return erros;
}

function CartaoPercentil({ desempenho, uf, ano }) {
  if (!desempenho) {
    return null;
  }

  const valorPercentil = Number(desempenho.percentil_usuario);
  const percentilValido = Number.isFinite(valorPercentil);
  const largura = percentilValido
    ? Math.min(Math.max(valorPercentil, 0), 100)
    : 0;

  return (
    <article
      className="escola-card escola-percentil"
      aria-labelledby="titulo-percentil"
    >
      <header className="escola-card__header">
        <div>
          <p className="escola-card__eyebrow">
            ANÁLISE A · DESEMPENHO NA UF
          </p>

          <h2
            id="titulo-percentil"
            className="escola-card__title"
          >
            Seu percentil em {desempenho.area_referencia} · {uf}
          </h2>

          <p className="escola-card__subtitle">
            Sua posição relativa entre as notas válidas de Matemática
            na unidade da Federação selecionada.
          </p>
        </div>

        <span className="escola-card__tag">
          ENEM {ano}
        </span>
      </header>

      <div className="escola-percentil__highlight">
        <div className="escola-percentil__score">
          <span className="escola-percentil__score-label">
            Seu percentil
          </span>

          <p className="escola-percentil__score-value">
            {formatarNumero(desempenho.percentil_usuario)}
            <span className="escola-percentil__ordinal">º</span>
          </p>

          <span className="escola-percentil__score-caption">
            Escala de 0 a 100
          </span>
        </div>

        <div className="escola-percentil__note">
          <span className="escola-percentil__note-label">
            Nota informada
          </span>

          <strong className="escola-percentil__note-value">
            {formatarNumero(desempenho.nota_usuario)}
          </strong>

          <span className="escola-percentil__note-unit">
            pontos em Matemática
          </span>
        </div>
      </div>

      <div className="escola-percentil__progress-section">
        <div className="escola-percentil__progress-labels">
          <span>0</span>
          <span>100</span>
        </div>

        <div
          className="escola-percentil__progress"
          role="progressbar"
          aria-label="Percentil da nota informada"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={largura}
        >
          <div
            className="escola-percentil__progress-fill"
            style={{ width: `${largura}%` }}
          />
        </div>
      </div>

      <p className="escola-percentil__interpretation">
        Cerca de <strong>{formatarNumero(desempenho.percentil_usuario)}%</strong>{' '}
        das notas válidas de Matemática de quem fez a prova em{' '}
        {uf} são inferiores à sua. Notas iguais à sua contam pela metade.
      </p>

      <div className="escola-percentil__method">
        <h3 className="escola-percentil__method-title">
          Base e metodologia
        </h3>

        <dl className="escola-percentil__method-grid">
          <div className="escola-percentil__method-item">
            <dt>Base de comparação</dt>
            <dd>
              {formatarInteiro(desempenho.total_notas_validas_uf)} notas
              válidas ({desempenho.variavel_nota})
            </dd>
          </div>

          <div className="escola-percentil__method-item">
            <dt>Registros sem nota válida</dt>
            <dd>
              {formatarInteiro(
                desempenho.registros_sem_nota_valida_uf,
              )}
            </dd>
          </div>

          <div className="escola-percentil__method-item escola-percentil__method-item--wide">
            <dt>Método</dt>
            <dd>
              {desempenho.metodo_percentil} · Edição {ano}.
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function CartaoComposicao({ composicao, uf }) {
  if (!composicao) {
    return null;
  }

  const categorias = composicao.categorias ?? [];
  const excluidos = composicao.excluidos ?? [];

  const descricaoBarra = categorias
    .map(
      (categoria) =>
        `${categoria.rotulo}: ${formatarNumero(
          categoria.percentual_validos,
        )}%`,
    )
    .join('; ');

  return (
    <article
      className="escola-card escola-composicao"
      aria-labelledby="titulo-composicao"
    >
      <header className="escola-card__header">
        <div>
          <p className="escola-card__eyebrow">
            ANÁLISE B · PERFIL DA UF
          </p>

          <h2
            id="titulo-composicao"
            className="escola-card__title"
          >
            Composição por tipo de escola · {uf}
          </h2>

          <p className="escola-card__subtitle">
            Distribuição dos registros com dependência administrativa
            classificada como pública ou privada.
          </p>
        </div>
      </header>

      <div className="escola-composicao__metrics">
        <div className="escola-composicao__metric">
          <span className="escola-composicao__metric-label">
            Registros válidos
          </span>

          <strong className="escola-composicao__metric-value">
            {formatarInteiro(composicao.total_validos)}
          </strong>

          <span className="escola-composicao__metric-caption">
            Com escola identificada
          </span>
        </div>

        <div className="escola-composicao__metric">
          <span className="escola-composicao__metric-label">
            Total de registros da UF
          </span>

          <strong className="escola-composicao__metric-value">
            {formatarInteiro(composicao.total_registros_uf)}
          </strong>

          <span className="escola-composicao__metric-caption">
            Base agregada da unidade
          </span>
        </div>

        <div className="escola-composicao__metric escola-composicao__metric--coverage">
          <span className="escola-composicao__metric-label">
            Cobertura
          </span>

          <strong className="escola-composicao__metric-value">
            {composicao.cobertura === null ||
            composicao.cobertura === undefined
              ? '—'
              : `${formatarNumero(composicao.cobertura)}%`}
          </strong>

          <span className="escola-composicao__metric-caption">
            Parcela com classificação disponível
          </span>
        </div>
      </div>

      {!composicao.mapeamento_confirmado && (
        <div
          className="escola-composicao__notice escola-composicao__notice--warning"
          role="note"
        >
          <strong>Composição provisória.</strong>{' '}
          {composicao.fonte_mapeamento}
        </div>
      )}

      <div
        className="escola-composicao__notice"
        role="note"
      >
        A classificação usa a <strong>dependência administrativa</strong>{' '}
        da escola de conclusão: pública (Federal, Estadual ou Municipal)
        e privada. A composição cobre apenas os registros com escola
        identificada no Censo Escolar. A cobertura indica essa parcela e
        não representa todos os inscritos ou presentes da UF.
      </div>

      <section className="escola-composicao__distribution">
        <div className="escola-composicao__section-heading">
          <h3>Distribuição dos registros válidos</h3>
          <p>Percentuais calculados sobre o total válido.</p>
        </div>

        {categorias.length > 0 ? (
          <>
            <div
              className="escola-composicao__bar"
              role="img"
              aria-label={`Distribuição entre participantes válidos: ${descricaoBarra}`}
            >
              {categorias.map((categoria) => {
                const percentual = Number(categoria.percentual_validos);
                const largura = Number.isFinite(percentual)
                  ? Math.min(Math.max(percentual, 0), 100)
                  : 0;

                return (
                  <span
                    key={categoria.chave}
                    className={`escola-composicao__segment ${
                      CLASSES_CATEGORIA[categoria.chave] ??
                      'escola-composicao__segment--other'
                    }`}
                    style={{ width: `${largura}%` }}
                  />
                );
              })}
            </div>

            <ul className="escola-composicao__legend">
              {categorias.map((categoria) => (
                <li key={categoria.chave}>
                  <span
                    className={`escola-composicao__legend-swatch ${
                      CLASSES_CATEGORIA[categoria.chave] ??
                      'escola-composicao__legend-swatch--other'
                    }`}
                    aria-hidden="true"
                  />

                  <span className="escola-composicao__legend-name">
                    {categoria.rotulo}
                  </span>

                  <strong>
                    {formatarNumero(categoria.percentual_validos)}%
                  </strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="escola-composicao__empty">
            Não há categorias válidas disponíveis para esta UF.
          </p>
        )}
      </section>

      <section className="escola-composicao__table-section">
        <div className="escola-composicao__section-heading">
          <h3>Detalhamento por categoria</h3>
          <p>
            Quantidade de registros e participação relativa na base.
          </p>
        </div>

        <div className="escola-composicao__table-wrapper">
          <table className="escola-composicao__table">
            <caption>
              Quantidade e percentual de participantes por tipo de escola
              em {uf}
            </caption>

            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Participantes</th>
                <th scope="col">% dos válidos</th>
                <th scope="col">% do total da UF</th>
              </tr>
            </thead>

            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.chave}>
                  <th scope="row">{categoria.rotulo}</th>
                  <td>{formatarInteiro(categoria.quantidade)}</td>
                  <td className="escola-composicao__table-emphasis">
                    {formatarNumero(categoria.percentual_validos)}%
                  </td>
                  <td>
                    {formatarNumero(categoria.percentual_total)}%
                  </td>
                </tr>
              ))}

              <tr className="escola-composicao__table-total">
                <th scope="row">Total válido</th>
                <td>{formatarInteiro(composicao.total_validos)}</td>
                <td>100%</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="escola-composicao__footnote">
          * A soma dos percentuais exibidos pode diferir de 100% em até
          0,01 ponto por arredondamento.
        </p>
      </section>

      <details className="escola-composicao__excluded">
        <summary>
          <span>
            Registros fora do denominador válido
          </span>

          <strong>
            {formatarInteiro(composicao.total_excluidos)}
          </strong>
        </summary>

        {excluidos.length > 0 ? (
          <ul>
            {excluidos.map((item) => (
              <li key={`${item.chave}-${item.codigo ?? 'nulo'}`}>
                <span>{item.rotulo}</span>

                <span className="escola-composicao__excluded-value">
                  {formatarInteiro(item.quantidade)}
                  <small>
                    {` (${formatarNumero(item.percentual_total)}% do total)`}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Não há detalhes de exclusão disponíveis.</p>
        )}
      </details>
    </article>
  );
}

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
      setErro(
        error?.message ||
          'Não foi possível calcular a análise. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="escola-page">
      <main className="escola-page__main">
        <div className="escola-page__container">
          <header className="escola-page__header">
            <p className="escola-page__eyebrow">
              RADAR ENEM / ANÁLISE EDUCACIONAL
            </p>

            <h1 className="escola-page__title">
              Tipo de escola: pública × privada
            </h1>

            <p className="escola-page__description">
              Consulte sua posição relativa em Matemática na UF da prova
              e visualize, separadamente, a distribuição agregada das
              escolas de conclusão identificadas entre as redes pública
              e privada.
            </p>
          </header>

          <div className="escola-page__layout">
            <aside className="escola-page__form-card">
              <div className="escola-page__form-heading">
                <span className="escola-page__step">01</span>

                <div>
                  <h2>Parâmetros da consulta</h2>
                  <p>Todos os campos são obrigatórios.</p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="escola-form"
              >
                <div className="escola-form__field">
                  <label htmlFor="uf-escola">
                    Unidade da Federação
                  </label>

                  <span className="escola-form__hint">
                    UF onde você realizou a prova
                  </span>

                  <select
                    id="uf-escola"
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                    aria-invalid={Boolean(errosCampos.estado)}
                    aria-describedby={
                      errosCampos.estado ? 'erro-uf-escola' : undefined
                    }
                    className={
                      errosCampos.estado
                        ? 'escola-form__input escola-form__input--error'
                        : 'escola-form__input'
                    }
                  >
                    <option value="">Selecione a UF</option>

                    {UFS.map((uf) => (
                      <option value={uf} key={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>

                  {errosCampos.estado && (
                    <p
                      id="erro-uf-escola"
                      className="escola-form__error"
                    >
                      {errosCampos.estado}
                    </p>
                  )}
                </div>

                <div className="escola-form__field">
                  <label htmlFor="nota-escola">
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
                    aria-describedby={
                      errosCampos.nota
                        ? 'erro-nota-escola ajuda-nota-escola'
                        : 'ajuda-nota-escola'
                    }
                    className={
                      errosCampos.nota
                        ? 'escola-form__input escola-form__input--error'
                        : 'escola-form__input'
                    }
                  />

                  <p
                    id="ajuda-nota-escola"
                    className="escola-form__hint"
                  >
                    Informe um valor entre 0 e 1000 pontos.
                  </p>

                  {errosCampos.nota && (
                    <p
                      id="erro-nota-escola"
                      className="escola-form__error"
                    >
                      {errosCampos.nota}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="escola-form__submit"
                >
                  {loading ? 'Calculando análise…' : 'Calcular análise'}
                </button>
              </form>

              <div className="escola-page__reference">
                <h3>Sobre esta consulta</h3>

                <p>
                  Referência: microdados do ENEM 2025 (INEP). A UF
                  considerada é a do local de prova.
                </p>

                <p>
                  A composição por tipo de escola é um indicador agregado
                  da UF, sem ligação individual com a nota informada.
                </p>
              </div>
            </aside>

            <section
              className="escola-page__results"
              aria-live="polite"
              aria-busy={loading}
            >
              {erro && (
                <div className="escola-page__alert" role="alert">
                  <strong>Não foi possível concluir a análise</strong>
                  <p>{erro}</p>
                </div>
              )}

              {!resultado && !erro && !loading && (
                <div className="escola-page__empty">
                  <span className="escola-page__empty-marker">
                    02
                  </span>

                  <h2>Sua análise aparecerá aqui</h2>

                  <p>
                    Escolha a UF e informe sua nota de Matemática para
                    visualizar seu percentil e a composição por tipo de
                    escola.
                  </p>
                </div>
              )}

              {loading && (
                <div className="escola-page__loading" role="status">
                  <span className="escola-page__loading-indicator" />

                  <div>
                    <strong>Calculando sua análise</strong>
                    <p>
                      Processando os dados de referência do ENEM 2025…
                    </p>
                  </div>
                </div>
              )}

              {resultado && (
                <>
                  <div className="escola-page__results-heading">
                    <div>
                      <p className="escola-page__eyebrow">
                        ANÁLISE CONCLUÍDA
                      </p>

                      <h2>Resultados da consulta</h2>

                      <p>
                        Referência: {resultado.estado_referencia} · ENEM{' '}
                        {resultado.ano_referencia}
                      </p>
                    </div>
                  </div>

                  <CartaoPercentil
                    desempenho={resultado.desempenho}
                    uf={resultado.estado_referencia}
                    ano={resultado.ano_referencia}
                  />

                  <CartaoComposicao
                    composicao={resultado.composicao_escolar}
                    uf={resultado.estado_referencia}
                  />

                  <aside className="escola-page__methodology">
                    <span className="escola-page__methodology-label">
                      Como interpretar
                    </span>

                    <p>
                      {resultado.nota_metodologica}{' '}
                      As duas análises não devem ser interpretadas como
                      comparação de desempenho entre escolas públicas e
                      privadas.
                    </p>
                  </aside>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Escola;
