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
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="areas-page">
     

      <main className="areas-page__main">
        <div className="areas-page__container">
          <FormularioAreas onConsultar={handleConsultar} carregando={loading} />

          {erro && (
            <div className="areas-page__error">
              <p>{erro}</p>
            </div>
          )}

          {resultado && (
            <div className="areas-page__result">
              <ResultadoAreas resultado={resultado} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Areas;
