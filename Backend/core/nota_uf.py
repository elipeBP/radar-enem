"""Serviço de análise estatística de nota por unidade federativa (issue #48)."""

from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Any

import polars as pl

from core.estatistica import calcular_percentil, calcular_zscore

AREAS_NOTA: dict[str, tuple[str, str]] = {
    "CN": ("NU_NOTA_CN", "Ciências da Natureza"),
    "CH": ("NU_NOTA_CH", "Ciências Humanas"),
    "LC": ("NU_NOTA_LC", "Linguagens"),
    "MT": ("NU_NOTA_MT", "Matemática"),
    "REDACAO": ("NU_NOTA_REDACAO", "Redação"),
}

UFS_VALIDAS = frozenset({
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
})

COLUNA_UF = "SG_UF_PROVA"
ANO_REFERENCIA = 2025
NOTA_MINIMA = 0.0
NOTA_MAXIMA = 1000.0


class DadosIndisponiveisError(RuntimeError):
    """Parquet ausente, ilegível ou sem as colunas necessárias."""


class UFsemDadosError(ValueError):
    """Não há notas válidas para a UF/área selecionada."""


def _caminho_resultados() -> Path:
    """Permite configurar o caminho completo por variável de ambiente."""
    caminho_configurado = os.environ.get("RESULTADOS_PARQUET_PATH")
    if caminho_configurado:
        return Path(caminho_configurado)
    pasta_backend = Path(__file__).resolve().parents[1]
    return pasta_backend / "etl" / "producao" / "resultados_2025.parquet"


def _abrir_resultados() -> pl.LazyFrame:
    caminho = _caminho_resultados()
    if not caminho.is_file():
        raise DadosIndisponiveisError(
            "O arquivo resultados_2025.parquet não foi encontrado. "
            "Disponibilize o Parquet oficial do ENEM 2025 para habilitar a consulta."
        )
    try:
        dados = pl.scan_parquet(caminho)
        colunas = set(dados.collect_schema().names())
    except Exception as exc:
        raise DadosIndisponiveisError(
            "Não foi possível abrir resultados_2025.parquet. Confira se o arquivo "
            "está íntegro e corresponde à ingestão oficial."
        ) from exc

    colunas_obrigatorias = {COLUNA_UF, *(coluna for coluna, _ in AREAS_NOTA.values())}
    ausentes = sorted(colunas_obrigatorias - colunas)
    if ausentes:
        raise DadosIndisponiveisError(
            "O Parquet não contém todas as colunas esperadas: " + ", ".join(ausentes)
        )
    return dados


def _como_lazy(resultados: pl.DataFrame | pl.LazyFrame) -> pl.LazyFrame:
    """Normaliza DataFrame/LazyFrame e valida seu schema, útil também nos testes."""
    lazy = resultados.lazy() if isinstance(resultados, pl.DataFrame) else resultados
    try:
        colunas = set(lazy.collect_schema().names())
    except Exception as exc:
        raise DadosIndisponiveisError("Não foi possível ler o schema dos dados.") from exc

    colunas_obrigatorias = {COLUNA_UF, *(coluna for coluna, _ in AREAS_NOTA.values())}
    ausentes = sorted(colunas_obrigatorias - colunas)
    if ausentes:
        raise DadosIndisponiveisError(
            "Os dados não contêm todas as colunas esperadas: " + ", ".join(ausentes)
        )
    return lazy


def analisar_nota_uf(
    estado: str,
    area: str,
    nota_usuario: float,
    resultados: pl.DataFrame | pl.LazyFrame | None = None,
) -> dict[str, Any]:
    """Calcula percentil, Z-Score e estatísticas para nota × UF.

    A população de referência são as notas finitas, não nulas e dentro de
    [0, 1000] na área e UF escolhidas. O Parquet produzido pela ingestão atual
    não inclui uma coluna de presença na prova; portanto, não presumimos que
    seja possível excluir ausentes com base em uma coluna inexistente.
    """
    if not isinstance(estado, str) or estado.strip().upper() not in UFS_VALIDAS:
        raise ValueError("Informe uma UF brasileira válida.")
    uf = estado.strip().upper()

    area_normalizada = area.strip().upper() if isinstance(area, str) else ""
    if area_normalizada not in AREAS_NOTA:
        raise ValueError("Selecione uma área válida do ENEM.")

    if isinstance(nota_usuario, bool) or not isinstance(nota_usuario, (int, float)):
        raise ValueError("A nota deve ser numérica.")
    nota = float(nota_usuario)
    if not math.isfinite(nota) or not NOTA_MINIMA <= nota <= NOTA_MAXIMA:
        raise ValueError("A nota deve ser um número finito entre 0 e 1000.")

    lazy = _como_lazy(resultados) if resultados is not None else _abrir_resultados()
    coluna_nota, nome_area = AREAS_NOTA[area_normalizada]
    coluna_uf = pl.col(COLUNA_UF).cast(pl.String).str.strip_chars().str.to_uppercase()
    nota_coluna = pl.col(coluna_nota).cast(pl.Float64, strict=False)
    dados_uf = (
        lazy.filter(coluna_uf == uf)
        .select(nota_coluna.alias("nota"))
        .collect()
    )
    notas = (
        dados_uf.filter(
            pl.col("nota").is_not_null()
            & pl.col("nota").is_finite()
            & (pl.col("nota") >= NOTA_MINIMA)
            & (pl.col("nota") <= NOTA_MAXIMA)
        )
        .get_column("nota")
    )

    if notas.len() == 0:
        raise UFsemDadosError(
            f"Não há notas válidas de {nome_area} para {uf} na base de referência."
        )

    percentil = calcular_percentil(nota, notas)
    media = float(notas.mean())
    desvio = float(notas.std(ddof=0) or 0.0)

    # O percentil permanece disponível se a distribuição for constante; nesse
    # caso, o Z-Score é matematicamente indefinido.
    try:
        zscore: float | None = calcular_zscore(nota, notas)
        motivo_zscore = None
    except ValueError:
        zscore = None
        motivo_zscore = "Z-Score indisponível: todas as notas válidas deste recorte são iguais."

    return {
        "ano_referencia": ANO_REFERENCIA,
        "estado_referencia": uf,
        "area": area_normalizada,
        "area_descricao": nome_area,
        "coluna_nota": coluna_nota,
        "nota_usuario": round(nota, 2),
        "percentil_usuario": round(float(percentil), 2),
        "zscore_usuario": None if zscore is None else round(float(zscore), 4),
        "media_uf": round(media, 2),
        "desvio_padrao_uf": round(desvio, 2),
        "total_notas_validas": int(notas.len()),
        "metodo_percentil": (
            "(quantidade de notas abaixo + 0,5 × quantidade de notas iguais) "
            "÷ quantidade de notas válidas × 100."
        ),
        "criterio_populacao": (
            "Registros da UF selecionada com nota não nula, finita e entre 0 e 1000 "
            "na área escolhida. O arquivo de referência não contém coluna de presença "
            "na prova, portanto não foi aplicado filtro de presença."
        ),
        "observacao_zscore": motivo_zscore,
    }
