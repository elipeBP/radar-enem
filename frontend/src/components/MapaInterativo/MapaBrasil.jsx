
import { useEffect, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps/core';

import './MapaBrasil.css';

const GEO_URL = '/data/estados.geojson';

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
  'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function obterUF(geografia) {
  const propriedades = geografia.properties ?? {};

  const sigla =
    propriedades.sigla ??
    propriedades.SIGLA ??
    propriedades.uf ??
    propriedades.UF ??
    String(propriedades['hc-key'] ?? '')
      .replace(/^br-/i, '');

  return String(sigla).toUpperCase();
}

function obterNome(geografia) {
  const propriedades = geografia.properties ?? {};

  return (
    propriedades.nome ??
    propriedades.NOME ??
    propriedades.name ??
    obterUF(geografia)
  );
}

function MapaBrasil({ estados, setEstados }) {
  const [dadosMapa, setDadosMapa] = useState(null);
  const [carregandoMapa, setCarregandoMapa] = useState(true);
  const [erroMapa, setErroMapa] = useState('');
  const [estadoEmFoco, setEstadoEmFoco] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarMapa() {
      try {
        setCarregandoMapa(true);
        setErroMapa('');

        const resposta = await fetch(GEO_URL, {
          signal: controller.signal,
        });

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar o mapa.');
        }

        const dados = await resposta.json();

        if (!Array.isArray(dados.features)) {
          throw new Error('O arquivo do mapa possui um formato inválido.');
        }

        if (!controller.signal.aborted) {
          setDadosMapa(dados);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErroMapa(
            'Não foi possível carregar o mapa do Brasil. Verifique o arquivo public/data/estados.geojson.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoMapa(false);
        }
      }
    }

    carregarMapa();

    return () => controller.abort();
  }, []);

  function alternarEstado(uf) {
    if (!UFS_BRASIL.includes(uf)) {
      return;
    }

    setEstados((selecionados) =>
      selecionados.includes(uf)
        ? selecionados.filter((estado) => estado !== uf)
        : [...selecionados, uf],
    );
  }

  function selecionarTodos() {
    setEstados([...UFS_BRASIL]);
  }

  function limparSelecao() {
    setEstados([]);
  }

  return (
    <section className="mapa-brasil">
      <div className="mapa-brasil__instructions">
        <div className="mapa-brasil__instruction-heading">
          <span className="mapa-brasil__pin" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="currentColor"
            >
              <path d="M12 2.5a8.5 8.5 0 0 0-8.5 8.5c0 6 8.5 12.5 8.5 12.5S20.5 17 20.5 11A8.5 8.5 0 0 0 12 2.5Zm0 11.8a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6Z" />
            </svg>
          </span>

          <div>
            <h3>
              Clique no mapa para selecionar os estados desejados
            </h3>

            <p>
              Selecione uma ou mais UFs. Clique novamente em um
              estado para removê-lo da seleção.
            </p>
          </div>
        </div>

        <div className="mapa-brasil__legend">
          <span>
            <i className="mapa-brasil__legend-dot mapa-brasil__legend-dot--selected" />
            Estados selecionados
          </span>

          <span>
            <i className="mapa-brasil__legend-dot mapa-brasil__legend-dot--available" />
            Estados disponíveis
          </span>
        </div>

        <div className="mapa-brasil__selection-count">
          <span>Estados selecionados</span>
          <strong>
            {estados.length} de {UFS_BRASIL.length}
          </strong>
        </div>

        <div className="mapa-brasil__actions">
          <button
            type="button"
            onClick={selecionarTodos}
            disabled={estados.length === UFS_BRASIL.length}
          >
            Selecionar todos
          </button>

          <button
            type="button"
            onClick={limparSelecao}
            disabled={estados.length === 0}
          >
            Limpar seleção
          </button>
        </div>
      </div>

      <div className="mapa-brasil__visual">
        <div className="mapa-brasil__map-heading">
          <span className="mapa-brasil__map-title">
            {estadoEmFoco
              ? `${estadoEmFoco.nome} (${estadoEmFoco.uf})`
              : 'Brasil · Unidades da Federação'}
          </span>

          <span className="mapa-brasil__map-hint">
            {estadoEmFoco
              ? estados.includes(estadoEmFoco.uf)
                ? 'Selecionado'
                : 'Clique para selecionar'
              : 'Mapa interativo'}
          </span>
        </div>

        {carregandoMapa && (
          <div className="mapa-brasil__message" role="status">
            Carregando mapa do Brasil…
          </div>
        )}

        {erroMapa && (
          <div className="mapa-brasil__message mapa-brasil__message--error" role="alert">
            {erroMapa}
          </div>
        )}

        {!carregandoMapa && !erroMapa && dadosMapa && (
          <div className="mapa-brasil__canvas">
           
            <ComposableMap
            className="mapa-brasil__svg"
            width={800}
            height={600}
            projection="geoMercator"
            projectionConfig={{
                scale: 500,
                center: [-54, -15],
            }}
            style={{
                width: '100%',
                height: 'auto',
                maxWidth: '720px',
                display: 'block',
                margin: '0 auto',
            }}
            aria-label="Mapa interativo do Brasil. Selecione estados clicando nas regiões."
            >
            <Geographies geography={dadosMapa}>
                {({ geographies }) =>
                geographies.map((geografia) => {
                    const uf = obterUF(geografia);
                    const nome = obterNome(geografia);
                    const selecionado = estados.includes(uf);

                    if (!UFS_BRASIL.includes(uf)) {
                    return null;
                    }

                    return (
                    <Geography
                        key={geografia.rsmKey}
                        geography={geografia}
                        className={`mapa-brasil__uf ${
                        selecionado ? 'mapa-brasil__uf--selected' : ''
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${nome} (${uf})`}
                        aria-pressed={selecionado}
                        fill={selecionado ? '#2563eb' : '#607d8b'}
                        stroke="#f1f5f9"
                        strokeWidth={1.1}
                        onClick={() => alternarEstado(uf)}
                        onMouseEnter={() => setEstadoEmFoco({ uf, nome })}
                        onMouseLeave={() => setEstadoEmFoco(null)}
                        onFocus={() => setEstadoEmFoco({ uf, nome })}
                        onBlur={() => setEstadoEmFoco(null)}
                        onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            alternarEstado(uf);
                        }
                        }}
                    />
                    );
                })
                }
            </Geographies>
            </ComposableMap>

          </div>
        )}
      </div>
    </section>
  );
}

export default MapaBrasil;
