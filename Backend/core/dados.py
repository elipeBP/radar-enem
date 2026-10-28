"""
core/dados.py
--------------
Camada de acesso aos dados de produção (#36).

Encapsula a leitura dos dois Parquets gerados no #34, permitindo trocar
o caminho via variável de ambiente sem alterar código -- resolve o ponto
pendente desde a review do #27, onde o caminho do CSV estava hardcoded
pro ambiente local do Rafael. Em dev local, funciona sem configurar nada
(usa um default sensato); em produção (Azure App Service), as variáveis
de ambiente apontam pro caminho onde o Parquet foi sincronizado do Blob
Storage no deploy.
"""

import os
from pathlib import Path

import polars as pl

# Backend/core/dados.py -> .parent.parent = Backend/
# Usar Path(__file__) (em vez de um caminho relativo solto) garante que
# o default funcione não importa de onde o processo da API for iniciado
# (de dentro de api/, da raiz de Backend/, etc.) -- já vimos esse tipo
# de bug de "diretório de trabalho" algumas vezes neste projeto.
PASTA_BACKEND = Path(__file__).resolve().parent.parent

CAMINHO_RESULTADOS_DEFAULT = PASTA_BACKEND / "etl" / "producao" / "resultados_2025.parquet"
CAMINHO_PARTICIPANTES_DEFAULT = PASTA_BACKEND / "etl" / "producao" / "participantes_2025.parquet"


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


def carregar_resultados() -> pl.DataFrame:
    """
    Lê resultados_2025.parquet (gerado no #34): colunas SG_UF_PROVA + as
    5 notas (CN, CH, LC, MT, Redação). É a fonte da Camada 1 (nota x UF)
    usada por todos os módulos.

    Caminho configurável via RESULTADOS_PARQUET_PATH.
    """
    caminho = _resolver_caminho("RESULTADOS_PARQUET_PATH", CAMINHO_RESULTADOS_DEFAULT)
    return pl.read_parquet(caminho)


def carregar_participantes() -> pl.DataFrame:
    """
    Lê participantes_2025.parquet (gerado no #34): colunas TP_SEXO +
    SG_UF_PROVA. É a fonte da Camada 2 (composição demográfica, sem
    nota) usada pelos módulos individuais.

    Caminho configurável via PARTICIPANTES_PARQUET_PATH.
    """
    caminho = _resolver_caminho("PARTICIPANTES_PARQUET_PATH", CAMINHO_PARTICIPANTES_DEFAULT)
    return pl.read_parquet(caminho)