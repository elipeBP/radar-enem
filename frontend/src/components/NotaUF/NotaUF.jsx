
import { useState } from 'react';
import { consultarNotaUF } from '../../services/api';
import './styles-nota-uf/NotaUF.css';

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

    if (nota.trim() === '' || !Number.isFinite(notaNumerica) ||
        notaNumerica < 0 || notaNumerica > 1000) {
      setErro('Informe uma nota válida entre 0 e 1000.');
      setResultado(null);
      return;
    }

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      const resposta = await consultarNotaUF({
        estado,
        area,
        nota: notaNumerica,
      });

      setResultado(resposta?.dados ?? resposta);
    } catch (error) {
      setErro(error?.message || 'Não foi possível consultar os dados.');
    } finally {
      setLoading(false);
    }
  }

  function formatarNumero(valor, casas = 2) {
    if (valor == null || !Number.isFinite(Number(valor))) {
      return 'Indisponível';
    }

    return Number(valor).toLocaleString('pt-BR', {
      maximumFractionDigits: casas,
    });
  }

  return (
    <section className="nota-uf">
      <div className="nota-uf__cabecalho">
        <p className="nota-uf__identificador">(TESTE) ANÁLISE ESTATÍSTICA</p>
        <h2 className="nota-uf__titulo">Nota por estado</h2>
        <p className="nota-uf__descricao">
          Compare sua nota com os resultados de participantes da mesma
          unidade federativa e área do ENEM.
        </p>
      </div>

      <form className="nota-uf__formulario" onSubmit={handleConsultar}>
        <div className="nota-uf__campo">
          <label htmlFor="nota-uf-estado">Estado (UF)</label>
          <select
            id="nota-uf-estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
          >
            {estadosBrasil.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div className="nota-uf__campo">
          <label htmlFor="nota-uf-area">Área do conhecimento</label>
          <select
            id="nota-uf-area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
          >
            {areasEnem.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="nota-uf__campo">
          <label htmlFor="nota-uf-nota">Sua nota</label>
          <input
            id="nota-uf-nota"
            type="number"
            min="0"
            max="1000"
            step="any"
            placeholder="Ex.: 720"
            value={nota}
            onChange={(event) => setNota(event.target.value)}
          />
        </div>

        <button
          className="nota-uf__botao"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Consultar nota'}
        </button>
      </form>

      {erro && (
        <div className="nota-uf__mensagem nota-uf__mensagem--erro" role="alert">
          <strong>Não foi possível realizar a consulta</strong>
          <p>{erro}</p>
        </div>
      )}

      {loading && (
        <p className="nota-uf__carregando" role="status">
          Calculando os indicadores...
        </p>
      )}

      {resultado && !loading && (
        <div className="nota-uf__resultados" aria-live="polite">
          <div className="nota-uf__resultados-cabecalho">
            <h3>Resultado da análise</h3>
            <p>
              {resultado.area_descricao} · {resultado.estado_referencia} ·
              ENEM {resultado.ano_referencia}
            </p>
          </div>

          <div className="nota-uf__cartoes">
            <article className="nota-uf__cartao">
              <span className="nota-uf__rotulo">Percentil</span>
              <strong className="nota-uf__valor">
                {formatarNumero(resultado.percentil_usuario)}%
              </strong>
              <p>
                Sua posição relativa na distribuição de notas válidas
                do recorte selecionado.
              </p>
            </article>

            <article className="nota-uf__cartao">
              <span className="nota-uf__rotulo">Z-Score</span>
              <strong className="nota-uf__valor">
                {resultado.zscore_usuario == null
                  ? '—'
                  : formatarNumero(resultado.zscore_usuario, 4)}
              </strong>
              <p>
                Distância em desvios-padrão em relação à média do recorte.
              </p>
            </article>

            <article className="nota-uf__cartao">
              <span className="nota-uf__rotulo">Média da UF</span>
              <strong className="nota-uf__valor">
                {formatarNumero(resultado.media_uf)}
              </strong>
              <p>Média das notas válidas utilizadas na comparação.</p>
            </article>
          </div>

          <div className="nota-uf__detalhes">
            <p>
              <strong>Sua nota:</strong>{' '}
              {formatarNumero(resultado.nota_usuario)}
            </p>
            <p>
              <strong>Notas comparadas:</strong>{' '}
              {formatarNumero(resultado.total_notas_validas, 0)}
            </p>
            {resultado.observacao_zscore && (
              <p>{resultado.observacao_zscore}</p>
            )}
            <p className="nota-uf__metodologia">
              {resultado.criterio_populacao}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default NotaUF;
