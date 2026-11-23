"""
core/dados.py
--------------
Camada de acesso aos dados de produção (#36, #17).

Leitura PREGUIÇOSA (`pl.scan_parquet`) com projeção de colunas e filtro
por UF empurrados pro leitor, igual ao já usado em core/nota_uf.py e
core/escola.py -- NUNCA materializa o arquivo inteiro (4,8 milhões de
linhas) em memória.

Isso não é só estilo: a versão anterior desta camada lia o Parquet
inteiro (`pl.read_parquet`, todas as colunas) uma vez no startup e
guardava em app.state. Em produção real no Render (23/11/2026, ver #17)
isso deu OOM -- "Out of memory (used over 512Mi)" -- ANTES da primeira
requisição, só carregando o ano padrão. O medido localmente
(`estimated_size`, ~285MB pro DataFrame já pronto) não capturava o pico
de memória durante a decodificação/alocação do Parquet inteiro somado à
própria base do processo (Python + FastAPI + Polars). Escanear e filtrar
por UF sob demanda evita isso: cada requisição só materializa as linhas
da(s) UF(s) pedida(s), nunca o arquivo inteiro.
"""

import os
from pathlib import Path

import polars as pl

from core.genero import ANOS_DISPONIVEIS, AnoIndisponivelError

# Backend/core/dados.py -> .parent.parent = Backend/
# Usar Path(__file__) (em vez de um caminho relativo solto) garante que
# o default funcione não importa de onde o processo da API for iniciado
# (de dentro de api/, da raiz de Backend/, etc.) -- já vimos esse tipo
# de bug de "diretório de trabalho" algumas vezes neste projeto.
PASTA_BACKEND = Path(__file__).resolve().parent.parent
PASTA_PRODUCAO = PASTA_BACKEND / "etl" / "producao"

# Ano cujo caminho pode ser sobreposto por variável de ambiente (dev local
# / testes, ver tests/test_genero_rota.py). Outros anos sempre usam o
# caminho padrão -- é o único caso usado hoje, e manter esse
# comportamento evita quebrar quem já configura via .env.
ANO_COM_OVERRIDE_DE_AMBIENTE = 2025

COLUNA_UF = "SG_UF_PROVA"
COLUNAS_RESULTADOS = {COLUNA_UF, "NU_NOTA_MT"}
COLUNAS_PARTICIPANTES = {COLUNA_UF, "TP_SEXO"}


class DadosIndisponiveisError(RuntimeError):
    """Parquet do ano pedido ausente, ilegível ou sem as colunas necessárias."""


def _resolver_caminho(variavel_ambiente: str, default_absoluto: Path) -> Path:
    """
    Lê `variavel_ambiente`; se não estiver definida, usa o default.

    Se a variável de ambiente estiver definida com um caminho RELATIVO,
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


def _caminho(nome_base: str, ano: int, variavel_ambiente: str) -> Path:
    default = PASTA_PRODUCAO / f"{nome_base}_{ano}.parquet"
    if ano == ANO_COM_OVERRIDE_DE_AMBIENTE:
        return _resolver_caminho(variavel_ambiente, default)
    return default


def _escanear(
    nome_base: str, ano: int, variavel_ambiente: str, colunas_obrigatorias: set[str]
) -> pl.LazyFrame:
    caminho = _caminho(nome_base, ano, variavel_ambiente)
    if not caminho.is_file():
        raise DadosIndisponiveisError(
            f"O arquivo {caminho.name} não foi encontrado. Disponibilize o "
            f"Parquet oficial do ENEM {ano} para habilitar a consulta."
        )
    try:
        lazy = pl.scan_parquet(caminho)
        colunas = set(lazy.collect_schema().names())
    except Exception as exc:
        raise DadosIndisponiveisError(
            f"Não foi possível abrir {caminho.name}. Confira se o arquivo "
            "está íntegro e corresponde à ingestão oficial."
        ) from exc

    ausentes = sorted(colunas_obrigatorias - colunas)
    if ausentes:
        raise DadosIndisponiveisError(
            f"{caminho.name} não contém todas as colunas esperadas: "
            + ", ".join(ausentes)
        )
    return lazy


def carregar_dados_genero(ano: int, estados: list[str]) -> tuple[pl.DataFrame, pl.DataFrame]:
    """
    Devolve (df_resultados, df_participantes) do `ano` pedido, já
    filtrados só pelas UFs de `estados` -- nunca o arquivo inteiro.

    Levanta:
      - AnoIndisponivelError: `ano` fora de ANOS_DISPONIVEIS (checado
        ANTES de tocar o disco, pra nunca tentar escanear um Parquet
        que não existe).
      - DadosIndisponiveisError: Parquet ausente, corrompido ou sem as
        colunas necessárias.
    """
    if ano not in ANOS_DISPONIVEIS:
        anos_lista = ", ".join(str(a) for a in sorted(ANOS_DISPONIVEIS))
        raise AnoIndisponivelError(
            f"Só há microdados de {anos_lista} carregados (pedido: {ano})."
        )

    lazy_resultados = _escanear(
        "resultados", ano, "RESULTADOS_PARQUET_PATH", COLUNAS_RESULTADOS
    )
    lazy_participantes = _escanear(
        "participantes", ano, "PARTICIPANTES_PARQUET_PATH", COLUNAS_PARTICIPANTES
    )

    filtro_uf = pl.col(COLUNA_UF).is_in(estados)
    df_resultados = (
        lazy_resultados.select(sorted(COLUNAS_RESULTADOS)).filter(filtro_uf).collect()
    )
    df_participantes = (
        lazy_participantes.select(sorted(COLUNAS_PARTICIPANTES)).filter(filtro_uf).collect()
    )
    return df_resultados, df_participantes
