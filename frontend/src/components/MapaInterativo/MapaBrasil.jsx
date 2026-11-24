
import { useEffect, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps/core';

import { useTheme } from '../../hooks/useTheme';
import { IconPin } from '../icons/Icons';

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
    String(propriedades['hc-key'] ?? '').replace(/^br-/i, '');

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

function corrigirOrientacaoParaD3(geometria) {
  if (!geometria) {
    return geometria;
  }

  if (geometria.type === 'Polygon') {
    return {
      ...geometria,
      coordinates: geometria.coordinates.map((anel) => [...anel].reverse()),
    };
  }

  if (geometria.type === 'MultiPolygon') {
    return {
      ...geometria,
      coordinates: geometria.coordinates.map((poligono) =>
        poligono.map((anel) => [...anel].reverse()),
      ),
    };
  }

  return geometria;
}

function corrigirGeoJSONParaD3(dados) {
  return {
    ...dados,
    features: dados.features.map((feature) => ({
      ...feature,
      geometry: corrigirOrientacaoParaD3(feature.geometry),
    })),
  };
}

function MapaBrasil({ estados, setEstados }) {
  const [dadosMapa, setDadosMapa] = useState(null);
  const [carregandoMapa, setCarregandoMapa] = useState(true);
  const [erroMapa, setErroMapa] = useState('');
  const [estadoEmFoco, setEstadoEmFoco] = useState(null);
  const { escuro } = useTheme();

  useEffect(() => {
    async function carregarMapa() {
      setCarregandoMapa(true);
      setErroMapa('');

      try {
        const resposta = await fetch(GEO_URL);

        if (!resposta.ok) {
          throw new Error(`Falha ao carregar GeoJSON: HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();

        if (
          dados.type !== 'FeatureCollection' ||
          !Array.isArray(dados.features) ||
          dados.features.length === 0
        ) {
          throw new Error('O arquivo não contém uma coleção válida de estados.');
        }

        const dadosCorrigidos = corrigirGeoJSONParaD3(dados);
        setDadosMapa(dadosCorrigidos);

        console.log(`[MapaBrasil] ${dadosCorrigidos.features.length} estados carregados.`);
      } catch (error) {
        console.error('[MapaBrasil] Erro ao carregar mapa:', error);
        setErroMapa('Não foi possível processar o mapa do Brasil. Consulte o Console para verificar o erro.');
      } finally {
        setCarregandoMapa(false);
      }
    }

    carregarMapa();
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

  // Cores do mapa: inline porque react-simple-maps só aceita prop `fill`/
  // `stroke`, não classe CSS -- precisam reagir ao dark mode manualmente.
  const corSelecionado = '#2563eb'; // brand-600, bom contraste nos dois temas
  const corDisponivel = escuro ? '#334155' : '#cbd5e1'; // slate-700 / slate-300
  const corTraco = escuro ? '#0f172a' : '#f8fafc'; // slate-900 / slate-50

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <IconPin className="size-5" />
          </span>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Clique no mapa para selecionar os estados desejados
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Selecione uma ou mais UFs. Clique novamente em um estado para
              removê-lo da seleção.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-2">
            <i className="size-2.5 rounded-full bg-brand-600" />
            Estados selecionados
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="size-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            Estados disponíveis
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
          <span className="text-slate-500 dark:text-slate-400">Estados selecionados</span>
          <strong className="text-slate-900 dark:text-white">
            {estados.length} de {UFS_BRASIL.length}
          </strong>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selecionarTodos}
            disabled={estados.length === UFS_BRASIL.length}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700
              transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50
              dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Selecionar todos
          </button>

          <button
            type="button"
            onClick={limparSelecao}
            disabled={estados.length === 0}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700
              transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50
              dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Limpar seleção
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-slate-900 dark:text-white">
            {estadoEmFoco
              ? `${estadoEmFoco.nome} (${estadoEmFoco.uf})`
              : 'Brasil · Unidades da Federação'}
          </span>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {estadoEmFoco
              ? estados.includes(estadoEmFoco.uf)
                ? 'Selecionado'
                : 'Clique para selecionar'
              : 'Mapa interativo'}
          </span>
        </div>

        {carregandoMapa && (
          <div role="status" className="grid h-72 place-items-center text-sm text-slate-500 dark:text-slate-400">
            Carregando mapa do Brasil…
          </div>
        )}

        {erroMapa && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {erroMapa}
          </div>
        )}

        {!carregandoMapa && !erroMapa && dadosMapa && (
          <ComposableMap
            width={800}
            height={600}
            projection="geoMercator"
            projectionConfig={{ scale: 675, center: [-54, -15] }}
            style={{ width: '100%', height: 'auto', maxWidth: '900px', display: 'block', margin: '0 auto' }}
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
                      className="cursor-pointer outline-none transition-[fill] duration-150 motion-reduce:transition-none
                        focus-visible:stroke-brand-500 focus-visible:stroke-2"
                      style={{ vectorEffect: 'non-scaling-stroke' }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${nome} (${uf})`}
                      aria-pressed={selecionado}
                      fill={selecionado ? corSelecionado : corDisponivel}
                      stroke={corTraco}
                      strokeWidth={1.4}
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
        )}
      </div>
    </section>
  );
}

export default MapaBrasil;
