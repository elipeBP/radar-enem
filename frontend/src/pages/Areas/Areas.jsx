
import { useState } from 'react';

import FormularioAreas from '../../components/FormularioAreas/FormularioAreas';
import ResultadoAreas from '../../components/ResultadoAreas/ResultadoAreas';
import { consultarAreas } from '../../services/api';

import './styles-areas/Areas.css';

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
      setErro(
        error?.message ||
          'Não foi possível realizar a análise. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="areas-page">
      <main className="areas-page__main">
        <div className="areas-page__container">
          <header className="areas-page__header">
            <p className="areas-page__eyebrow">
              RADAR ENEM / DESEMPENHO
            </p>

            <h1 className="areas-page__title">
              Nota × Área do Conhecimento
            </h1>

            <p className="areas-page__description">
              Compare seu desempenho nas áreas do ENEM, identifique
              seus pontos fortes e visualize como seus resultados
              se posicionam em relação à distribuição nacional.
            </p>
          </header>

          <section
            className="areas-page__form-card"
            aria-labelledby="areas-form-title"
          >
            <div className="areas-page__section-heading">
              <span className="areas-page__step">01</span>

              <div>
                <h2 id="areas-form-title">
                  Informe suas notas
                </h2>

                <p>
                  Preencha os dados solicitados para gerar sua análise.
                </p>
              </div>
            </div>

            <FormularioAreas
              onConsultar={handleConsultar}
              carregando={loading}
            />
          </section>

          {erro && (
            <div
              className="areas-page__error"
              role="alert"
            >
              <span className="areas-page__error-title">
                Não foi possível concluir a análise
              </span>

              <p>{erro}</p>
            </div>
          )}

          {resultado && (
            <section
              className="areas-page__result"
              aria-label="Resultado da análise por área"
            >
              <div className="areas-page__result-heading">
                <div>
                  <p className="areas-page__eyebrow">
                    ANÁLISE CONCLUÍDA
                  </p>

                  <h2>Seu desempenho por área</h2>

                  <p>
                    Consulte os percentis, compare as áreas e
                    observe a dispersão entre seus resultados.
                  </p>
                </div>

                <span className="areas-page__result-marker">
                  Resultados
                </span>
              </div>

              <ResultadoAreas resultado={resultado} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default Areas;
