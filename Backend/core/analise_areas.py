from pathlib import Path
from statistics import pstdev

import polars as pl

from core.estatistica import calcular_percentil


# Caminho para o arquivo já processado
CAMINHO_PARQUET = (
    Path(__file__).resolve().parents[1] / "etl" / "producao" / "resultados_2025.parquet"
)

# Mapeamento entre os campos da API e as colunas do ENEM
COLUNAS_AREAS = {
    "Ciências da Natureza": "NU_NOTA_CN",
    "Ciências Humanas": "NU_NOTA_CH",
    "Linguagens": "NU_NOTA_LC",
    "Matemática": "NU_NOTA_MT",
    "Redação": "NU_NOTA_REDACAO",
}


def analisar_areas(
    nota_cn: float,
    nota_ch: float,
    nota_lc: float,
    nota_mt: float,
    nota_redacao: float,
) -> dict:

    df = pl.read_parquet(CAMINHO_PARQUET)

    notas_usuario = {
        "Ciências da Natureza": nota_cn,
        "Ciências Humanas": nota_ch,
        "Linguagens": nota_lc,
        "Matemática": nota_mt,
        "Redação": nota_redacao,
    }

    resultados = []

    for area, coluna in COLUNAS_AREAS.items():

        serie = df[coluna].drop_nulls()
        percentil = calcular_percentil(notas_usuario[area], serie)

        percentil = calcular_percentil(
            notas_usuario[area],
            serie,
        )

        resultados.append(
            {
                "area": area,
                "nota": notas_usuario[area],
                "percentil": round(percentil, 2),
            }
        )

    # Ordena do maior para o menor percentil
    resultados_ordenados = sorted(
        resultados,
        key=lambda item: item["percentil"],
        reverse=True,
    )

    area_mais_forte = resultados_ordenados[0]["area"]
    area_mais_fraca = resultados_ordenados[-1]["area"]

    percentis = [
        item["percentil"]
        for item in resultados
    ]


    # mede o quanto os desempenhos relativos variam entre as áreas
    desvio_padrao_percentis = pstdev(percentis)

    return {
        "areas": resultados_ordenados,
        "area_mais_forte": area_mais_forte,
        "area_mais_fraca": area_mais_fraca,
        "desvio_padrao_percentis": round(
            desvio_padrao_percentis,
            2,
        ),
    }