
import { useState } from 'react';
import { consultarFaixaEtaria } from '../../services/api';
import './styles-faixa-etaria/FaixaEtaria.css';

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function formatarNumero(valor, casas = 2) {
  if (valor == null || !Number.isFinite(Number(valor))) {
    return 'Indisponível';
  }

  return Number(valor).toLocaleString('pt-BR', {
    maximumFractionDigits: casas,
  });
}

function FaixaEtaria() {
  const [estado, setEstado] = useState('SC');
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
      const resposta = await consultarFaixaEtaria({
        estado,
        nota_matematica: notaNumerica,
      });

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
    <section className="faixa-etaria">
      <div className="faixa-etaria__cabecalho">
        <p className="faixa-etaria__identificador">FILTRO 5</p>
        <h2 className="faixa-etaria__titulo">Faixa etária</h2>
        <p className="faixa-etaria__descricao">
          Compare sua nota de Matemática com os participantes da mesma UF e
          veja a composição por faixa etária dos inscritos — são duas
          estatísticas independentes, sem correlação entre nota e idade.
        </p>
      </div>

      <form className="faixa-etaria__formulario" onSubmit={handleConsultar}>
        <div className="faixa-etaria__campo">
          <label htmlFor="faixa-etaria-estado">Estado (UF)</label>
          <select
            id="faixa-etaria-estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
          >
            {estadosBrasil.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div className="faixa-etaria__campo">
          <label htmlFor="faixa-etaria-nota">Sua nota em Matemática</label>
          <input
            id="faixa-etaria-nota"
            type="number"
            min="0"
            max="1000"
            step="any"
            placeholder="Ex.: 700"
            value={nota}
            onChange={(event) => setNota(event.target.value)}
          />
        </div>

        <button
          className="faixa-etaria__botao"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {erro && (
        <div className="faixa-etaria__mensagem faixa-etaria__mensagem--erro" role="alert">
          <strong>Não foi possível realizar a consulta</strong>
          <p>{erro}</p>
        </div>
      )}

      {loading && (
        <p className="faixa-etaria__carregando" role="status">
          Calculando os indicadores...
        </p>
      )}

      {resultado && !loading && (
        <div className="faixa-etaria__resultados" aria-live="polite">
          <div className="faixa-etaria__resultados-cabecalho">
            <h3>Resultado da análise</h3>
            <p>
              {resultado.estado_referencia} · ENEM {resultado.ano_referencia}
            </p>
          </div>

          <div className="faixa-etaria__cartoes">
            <article className="faixa-etaria__cartao">
              <span className="faixa-etaria__rotulo">Percentil (Matemática)</span>
              <strong className="faixa-etaria__valor">
                {formatarNumero(desempenho.percentil_usuario)}%
              </strong>
              <p>Sua posição entre as notas válidas da UF.</p>
            </article>

            <article className="faixa-etaria__cartao">
              <span className="faixa-etaria__rotulo">Z-Score</span>
              <strong className="faixa-etaria__valor">
                {desempenho.zscore_usuario == null
                  ? '—'
                  : formatarNumero(desempenho.zscore_usuario, 4)}
              </strong>
              <p>
                {desempenho.observacao_zscore ||
                  'Distância em desvios-padrão em relação à média da UF.'}
              </p>
            </article>
          </div>

          <div className="faixa-etaria__composicao">
            <h4>Composição por faixa etária — {resultado.estado_referencia}</h4>
            <p className="faixa-etaria__composicao-legenda">
              {formatarNumero(composicao.total_validos, 0)} de{' '}
              {formatarNumero(composicao.total_inscritos, 0)} inscritos com
              faixa etária classificada.
            </p>

            <ul className="faixa-etaria__barras">
              {composicao.categorias
                .filter((c) => c.quantidade > 0)
                .map((categoria) => (
                  <li key={categoria.codigo} className="faixa-etaria__barra-item">
                    <div className="faixa-etaria__barra-rotulo">
                      <span>{categoria.rotulo}</span>
                      <span>{formatarNumero(categoria.percentual_validos)}%</span>
                    </div>
                    <div className="faixa-etaria__barra-trilho">
                      <div
                        className="faixa-etaria__barra-preenchimento"
                        style={{
                          width: `${(categoria.quantidade / maiorQuantidade) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          <p className="faixa-etaria__metodologia">
            {resultado.nota_metodologica}
          </p>
        </div>
      )}
    </section>
  );
}

export default FaixaEtaria;
