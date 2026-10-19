
import './styles-resultado-genero/ResultadoGenero.css';

function ResultadoGenero({ resultado, loading, error }) {
  if (loading) {
    return (
      <div
        className="resultado-genero__message resultado-genero__message--loading"
        role="status"
      >
        Consultando os dados...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="resultado-genero__message resultado-genero__message--error"
        role="alert"
      >
        <h3>Não foi possível consultar os dados</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!resultado) {
    return (
      <section className="resultado-genero__empty">
        <h3 className="resultado-genero__empty-title">
          Nenhuma consulta realizada
        </h3>
        <p className="resultado-genero__empty-description">
          Configure os filtros e clique em Consultar dados para visualizar
          os resultados.
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
    <section className="resultado-genero">
      <article className="resultado-genero__percentile-card">
        <span className="resultado-genero__label">
          Percentil do usuário
        </span>

        <div className="resultado-genero__percentile-value">
          <span className="resultado-genero__percentile-number">
            {percentilValido.toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })}
          </span>
          <span className="resultado-genero__percentile-unit">º</span>
        </div>

        <p className="resultado-genero__description">
          Seu desempenho em relação ao grupo filtrado.
        </p>

        <div
          className="resultado-genero__progress"
          role="progressbar"
          aria-label="Percentil do usuário"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentilValido}
        >
          <div className="resultado-genero__progress-labels">
            <span>0</span>
            <span>100</span>
          </div>

          <div className="resultado-genero__progress-track">
            <div
              className="resultado-genero__progress-fill"
              style={{ width: `${percentilValido}%` }}
            />
          </div>
        </div>
      </article>

      <article className="resultado-genero__average-card">
        <span className="resultado-genero__label">
          Média do grupo filtrado
        </span>

        <p className="resultado-genero__average-value">
          {mediaGrupo == null
            ? '—'
            : Number.isFinite(Number(mediaGrupo))
              ? Number(mediaGrupo).toLocaleString('pt-BR', {
                  maximumFractionDigits: 2,
                })
              : '—'}
        </p>

        <p className="resultado-genero__average-description">
          Média calculada para os critérios selecionados.
        </p>
      </article>
    </section>
  );
}

export default ResultadoGenero;

