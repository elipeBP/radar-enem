"""
core/dados.py
--------------
Camada de acesso aos dados de produção (#36).

Encapsula a leitura dos Parquets gerados no #34/#17, permitindo trocar
o caminho via variável de ambiente sem alterar código -- resolve o ponto
pendente desde a review do #27, onde o caminho do CSV estava hardcoded
pro ambiente local do Rafael. Em dev local, funciona sem configurar nada
(usa um default sensato); em produção (Docker/Render), os Parquets já
vêm embutidos na imagem (ver Dockerfile) nesse mesmo caminho padrão.

Suporte a múltiplos anos (#17): a Trilha de Gênero é o único módulo com
seletor de ano exposto no frontend, então só ela carrega por ano -- os
demais módulos (nota_uf, escola) seguem de um único ano fixo, fora do
escopo deste arquivo. `obter_dados_do_ano` mantém no máximo UM ano
"extra" (além do padrão, já carregado no startup) em cache por vez:
medido com os Parquets reais, um ano sozinho ocupa ~285MB em memória
(ver core/genero.py ANOS_DISPONIVEIS) -- manter os dois anos residentes
ao mesmo tempo o tempo todo estouraria os 512MB do free tier do Render.
"""

import os
from pathlib import Path
from typing import Any

import polars as pl

from core.genero import ANO_PADRAO, ANOS_DISPONIVEIS, AnoIndisponivelError

# Backend/core/dados.py -> .parent.parent = Backend/
# Usar Path(__file__) (em vez de um caminho relativo solto) garante que
# o default funcione não importa de onde o processo da API for iniciado
# (de dentro de api/, da raiz de Backend/, etc.) -- já vimos esse tipo
# de bug de "diretório de trabalho" algumas vezes neste projeto.
PASTA_BACKEND = Path(__file__).resolve().parent.parent
PASTA_PRODUCAO = PASTA_BACKEND / "etl" / "producao"


class DadosNaoCarregadosError(RuntimeError):
    """O ano padrão ainda não foi carregado em app.state (startup)."""


def _resolver_caminho(variavel_ambiente: str, default_absoluto: Path) -> Path:
    """
    Lê `variavel_ambiente`; se não estiver definida, usa o default.

    Se a variável de ambiente estiver definida com um caminho RELATIVO
    (ex: "etl/producao/resultados_2025.parquet", como no .env.example),
    resolve esse caminho relativo a Backend/ -- e não ao diretório de
    trabalho atual do processo. Isso evita reintroduzir o mesmo tipo de
    bug de CWD que já resolvemos no ingestion.py: sem isso, o mesmo
    .env funcionaria rodando de um lugar e quebraria rodando de outro.
    """
    valor = os.environ.get(variavel_ambiente)
    if valor is None:
        return default_absoluto

    caminho = Path(valor)
    if not caminho.is_absolute():
        caminho = PASTA_BACKEND / caminho
    return caminho


def _caminho_resultados(ano: int) -> Path:
    default = PASTA_PRODUCAO / f"resultados_{ano}.parquet"
    # A variável de ambiente só sobrepõe o ano padrão (2025): é o único
    # caso usado hoje (dev local / testes, ver tests/test_genero_rota.py)
    # e manter esse comportamento evita quebrar quem já configura via
    # .env. Outros anos sempre usam o caminho padrão (igual ao que o
    # Dockerfile baixa da GitHub Release, ver #17).
    if ano == ANO_PADRAO:
        return _resolver_caminho("RESULTADOS_PARQUET_PATH", default)
    return default


def _caminho_participantes(ano: int) -> Path:
    default = PASTA_PRODUCAO / f"participantes_{ano}.parquet"
    if ano == ANO_PADRAO:
        return _resolver_caminho("PARTICIPANTES_PARQUET_PATH", default)
    return default


def carregar_resultados(ano: int = ANO_PADRAO) -> pl.DataFrame:
    """
    Lê resultados_<ano>.parquet (gerado no #34/#17): colunas SG_UF_PROVA +
    as 5 notas (CN, CH, LC, MT, Redação). É a fonte da Camada 1 (nota x UF)
    usada por todos os módulos.

    Caminho do ano padrão configurável via RESULTADOS_PARQUET_PATH.
    """
    return pl.read_parquet(_caminho_resultados(ano))


def carregar_participantes(ano: int = ANO_PADRAO) -> pl.DataFrame:
    """
    Lê participantes_<ano>.parquet (gerado no #34/#17): colunas TP_SEXO +
    SG_UF_PROVA. É a fonte da Camada 2 (composição demográfica, sem
    nota) usada pelos módulos individuais.

    Caminho do ano padrão configurável via PARTICIPANTES_PARQUET_PATH.
    """
    return pl.read_parquet(_caminho_participantes(ano))


def obter_dados_do_ano(app_state: Any, ano: int) -> tuple[pl.DataFrame, pl.DataFrame]:
    """
    Devolve (df_resultados, df_participantes) do `ano` pedido, carregando
    sob demanda quando não é o ano padrão.

    O ano padrão (ANO_PADRAO) já vem carregado em app.state desde o
    startup (lifespan, #36) -- lido daqui, nunca recarregado do disco.
    Qualquer outro ano suportado é carregado na primeira requisição e
    fica em cache em app.state.cache_ano_extra até que outro ano
    diferente seja pedido, quando é substituído (ver módulo: no máximo
    um ano extra residente por vez, pra não estourar a RAM do Render).

    Levanta:
      - AnoIndisponivelError: `ano` fora de ANOS_DISPONIVEIS (checado
        ANTES de tocar o disco, pra nunca tentar ler um Parquet que não
        existe).
      - DadosNaoCarregadosError: o ano padrão foi pedido mas o startup
        ainda não rodou (app.state vazio).
    """
    if ano not in ANOS_DISPONIVEIS:
        anos_lista = ", ".join(str(a) for a in sorted(ANOS_DISPONIVEIS))
        raise AnoIndisponivelError(
            f"Só há microdados de {anos_lista} carregados (pedido: {ano})."
        )

    if ano == ANO_PADRAO:
        df_resultados = getattr(app_state, "df_resultados", None)
        df_participantes = getattr(app_state, "df_participantes", None)
        if df_resultados is None or df_participantes is None:
            raise DadosNaoCarregadosError("Dados ainda não carregados.")
        return df_resultados, df_participantes

    cache = getattr(app_state, "cache_ano_extra", None)
    if cache is not None and cache[0] == ano:
        return cache[1], cache[2]

    df_resultados = carregar_resultados(ano)
    df_participantes = carregar_participantes(ano)
    app_state.cache_ano_extra = (ano, df_resultados, df_participantes)
    return df_resultados, df_participantes