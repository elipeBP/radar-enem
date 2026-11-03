
import './ResultadoAreas.css';

function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 1,
      }).format(numero)
    : String(valor);
}

function interpretarDesvio(desvio) {
  const valor = Number(desvio);

  if (desvio === null || desvio === undefined || desvio === '' ||
      !Number.isFinite(valor)) {
    return {
      titulo: 'Interpretação indisponível',
      descricao:
        'Não há informação suficiente para interpretar a dispersão entre as áreas.',
    };
  }

  if (valor <= 5) {
    return {
      titulo: 'Perfil bastante equilibrado',
      descricao:
        'Seus percentis estão próximos entre si, indicando desempenho relativo consistente entre as áreas.',
    };
  }

  if (valor <= 10) {
    return {
      titulo: 'Perfil moderadamente equilibrado',
      descricao:
        'Há algumas diferenças entre seus desempenhos relativos, mas sem grande dispersão entre as áreas.',
    };
  }

  return {
    titulo: 'Perfil com diferenças mais marcantes',
    descricao:
      'Seus percentis apresentam maior dispersão, indicando áreas de destaque e outras relativamente mais distantes.',
  };
}

function ResultadoAreas({ resultado }) {
  if (!resultado) {
    return null;
  }

  const {
    areas = [],
    area_mais_forte,
    area_mais_fraca,
    desvio_padrao_percentis,
  } = resultado;

  const interpretacaoDesvio = interpretarDesvio(
    desvio_padrao_percentis,
  );

  return (
    <div className="resultado-areas">
      <section className="resultado-areas__panel">
        <header className="resultado-areas__panel-header">
          <div>
            <h3 className="resultado-areas__panel-title">
              Desempenho por área
            </h3>

            <p className="resultado-areas__panel-description">
              Percentil em relação à distribuição nacional do ENEM 2025.
            </p>
          </div>

          <span className="resultado-areas__unit">
            Percentis
          </span>
        </header>

        {areas.length > 0 ? (
          <div className="resultado-areas__list">
            {areas.map((item) => {
              const numeroPercentil = Number(item.percentil);

              const percentilLimitado = Number.isFinite(numeroPercentil)
                ? Math.min(100, Math.max(0, numeroPercentil))
                : 0;

              return (
                <article
                  key={item.area}
                  className="resultado-areas__area"
                >
                  <div className="resultado-areas__area-header">
                    <h4 className="resultado-areas__area-name">
                      {item.area}
                    </h4>

                    <span className="resultado-areas__percentile">
                      Percentil {formatarValor(item.percentil)}
                    </span>
                  </div>

                  <div
                    className="resultado-areas__progress"
                    role="progressbar"
                    aria-label={`Percentil em ${item.area}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentilLimitado}
                  >
                    <div
                      className="resultado-areas__progress-fill"
                      style={{ width: `${percentilLimitado}%` }}
                    />
                  </div>

                  <div className="resultado-areas__area-footer">
                    <span>Nota obtida</span>
                    <strong>{formatarValor(item.nota)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="resultado-areas__empty">
            Não há resultados por área disponíveis para esta consulta.
          </p>
        )}
      </section>

      <section
        className="resultado-areas__summary"
        aria-label="Resumo do desempenho"
      >
        <article className="resultado-areas__summary-card resultado-areas__summary-card--strong">
          <span className="resultado-areas__summary-label">
            Melhor desempenho relativo
          </span>

          <h3 className="resultado-areas__summary-value">
            {area_mais_forte || '—'}
          </h3>

          <p className="resultado-areas__summary-description">
            Área com maior destaque relativo na análise.
          </p>
        </article>

        <article className="resultado-areas__summary-card resultado-areas__summary-card--weak">
          <span className="resultado-areas__summary-label">
            Menor desempenho relativo
          </span>

          <h3 className="resultado-areas__summary-value">
            {area_mais_fraca || '—'}
          </h3>

          <p className="resultado-areas__summary-description">
            Área que merece atenção na comparação entre resultados.
          </p>
        </article>

        <article className="resultado-areas__summary-card resultado-areas__summary-card--balance">
          <span className="resultado-areas__summary-label">
            Dispersão entre percentis
          </span>

          <h3 className="resultado-areas__deviation">
            {formatarValor(desvio_padrao_percentis)}
          </h3>

          <p className="resultado-areas__interpretation-title">
            {interpretacaoDesvio.titulo}
          </p>

          <p className="resultado-areas__summary-description">
            {interpretacaoDesvio.descricao}
          </p>
        </article>
      </section>

      <p className="resultado-areas__disclaimer">
        A comparação por percentis representa uma posição relativa na
        distribuição utilizada. Ela não corresponde diretamente à
        porcentagem de questões acertadas.
      </p>
    </div>
  );
}

export default ResultadoAreas;
