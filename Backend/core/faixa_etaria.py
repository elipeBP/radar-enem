"""Lógica de negócio do Filtro 5 — Faixa Etária (AV4, issue #52).

Mesma arquitetura da Trilha de Gênero (core/genero.py): DUAS fontes
independentes, sem junção entre elas:

1. Camada 1 — Desempenho (nota × UF, fonte RESULTADOS): percentil e
   Z-Score da nota de Matemática informada frente às notas válidas de
   `NU_NOTA_MT` com `SG_UF_PROVA` igual à UF.

2. Camada 2 — Composição por faixa etária (fonte PARTICIPANTES): contagem
   e percentual de `TP_FAIXA_ETARIA` entre os inscritos da UF.

Fonte oficial do mapeamento: `Dicionário_Microdados_Enem_2024.xlsx`
(aba `PARTICIPANTES_2024`), variável `TP_FAIXA_ETARIA` — 20 categorias,
sem lacuna (autodeclarada na inscrição, diferente de
`TP_DEPENDENCIA_ADM_ESC` do Filtro 4, que depende do Censo Escolar).
Ver `docs/dicionario_dados.md`.

Não há junção entre RESULTADOS e PARTICIPANTES: mesmo "BLOQUEIO CRÍTICO"
documentado para a Trilha de Gênero (NU_SEQUENCIAL != NU_INSCRICAO) —
a nota não é atribuída a nenhuma faixa etária específica.

Sem seletor de ano (diferente da Trilha de Gênero): sempre o ano padrão,
igual a core/escola.py e core/nota_uf.py.

Leitura dos dados: `pl.scan_parquet` (lazy) com projeção de colunas e
filtro por UF empurrados para o leitor, nunca carregando os ~4,8 milhões
de linhas inteiras em memória (mesmo motivo do #17 — ver
core/dados.py:carregar_dados_genero).
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import polars as pl

from core.estatistica import calcular_percentil, calcular_zscore

# ---------------------------------------------------------------------------
# Localização dos Parquets
# ---------------------------------------------------------------------------
PASTA_BACKEND = Path(__file__).resolve().parents[1]
PASTA_PARQUET = Path(
    os.environ.get("RADAR_ENEM_PASTA_PARQUET", PASTA_BACKEND / "etl" / "producao")
)
NOME_RESULTADOS = "resultados_2025.parquet"
NOME_PARTICIPANTES = "participantes_2025.parquet"

COLUNA_UF = "SG_UF_PROVA"
COLUNA_NOTA = "NU_NOTA_MT"
COLUNA_FAIXA = "TP_FAIXA_ETARIA"

COLUNAS_RESULTADOS = {COLUNA_UF, COLUNA_NOTA}
COLUNAS_PARTICIPANTES = {COLUNA_UF, COLUNA_FAIXA}

ANO_REFERENCIA = 2025
NOTA_MINIMA = 0.0
NOTA_MAXIMA = 1000.0

UFS_VALIDAS = frozenset({
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
})

# ---------------------------------------------------------------------------
# Mapeamento de TP_FAIXA_ETARIA (faixa etária do participante)
# ---------------------------------------------------------------------------
# Fonte oficial CONFIRMADA no dicionário local de 2024
# (Dicionário_Microdados_Enem_2024.xlsx, aba PARTICIPANTES_2024) -- ver
# docs/dicionario_dados.md pra nota sobre por que vale também pra 2025
# (mesma coluna, mesmos valores observados, metodologia estável do INEP).
FAIXAS_ETARIAS: dict[int, str] = {
    1: "Menor de 17 anos",
    2: "17 anos",
    3: "18 anos",
    4: "19 anos",
    5: "20 anos",
    6: "21 anos",
    7: "22 anos",
    8: "23 anos",
    9: "24 anos",
    10: "25 anos",
    11: "Entre 26 e 30 anos",
    12: "Entre 31 e 35 anos",
    13: "Entre 36 e 40 anos",
    14: "Entre 41 e 45 anos",
    15: "Entre 46 e 50 anos",
    16: "Entre 51 e 55 anos",
    17: "Entre 56 e 60 anos",
    18: "Entre 61 e 65 anos",
    19: "Entre 66 e 70 anos",
    20: "Maior de 70 anos",
}


class DadosIndisponiveisError(RuntimeError):
    """Arquivo Parquet ausente, ilegível ou sem as colunas obrigatórias."""


class UFsemDadosError(ValueError):
    """Não há registros utilizáveis para a UF solicitada após os filtros."""


# ---------------------------------------------------------------------------
# Acesso aos dados
# ---------------------------------------------------------------------------
def _validar_colunas(colunas: set[str] | list[str], obrigatorias: set[str], nome: str) -> None:
    ausentes = sorted(obrigatorias - set(colunas))
    if ausentes:
        raise DadosIndisponiveisError(
            f"O arquivo {nome} não contém as colunas obrigatórias: "
            f"{', '.join(ausentes)}. Confira o ETL (etl/ingestion.py) e regenere os Parquets."
        )


def _abrir_parquet(caminho: Path, obrigatorias: set[str]) -> pl.LazyFrame:
    """Abre o Parquet de forma lazy e valida o schema sem ler os dados."""
    if not caminho.exists():
        raise DadosIndisponiveisError(
            f"Arquivo {caminho.name} não encontrado na pasta de dados do servidor. "
            "Execute o ETL com os microdados oficiais do INEP 2025."
        )
    try:
        lf = pl.scan_parquet(caminho)
        colunas = lf.collect_schema().names()
    except Exception as exc:  # arquivo corrompido, formato inválido etc.
        raise DadosIndisponiveisError(
            f"Não foi possível ler {caminho.name}: {exc}"
        ) from exc
    _validar_colunas(colunas, obrigatorias, caminho.name)
    return lf


def abrir_resultados() -> pl.LazyFrame:
    return _abrir_parquet(PASTA_PARQUET / NOME_RESULTADOS, COLUNAS_RESULTADOS)


def abrir_participantes() -> pl.LazyFrame:
    return _abrir_parquet(PASTA_PARQUET / NOME_PARTICIPANTES, COLUNAS_PARTICIPANTES)


def _como_lazy(df: pl.DataFrame | pl.LazyFrame, obrigatorias: set[str], nome: str) -> pl.LazyFrame:
    lf = df.lazy() if isinstance(df, pl.DataFrame) else df
    _validar_colunas(lf.collect_schema().names(), obrigatorias, nome)
    return lf


def _filtro_uf(uf: str) -> pl.Expr:
    return pl.col(COLUNA_UF).cast(pl.String).str.strip_chars().str.to_uppercase() == uf


def _percentual(quantidade: int, total: int) -> float | None:
    """Percentual com 2 casas; None quando o denominador é zero."""
    if total <= 0:
        return None
    return round(quantidade / total * 100, 2)


# ---------------------------------------------------------------------------
# Camada 1 — nota x UF
# ---------------------------------------------------------------------------
def obter_notas_uf(resultados: pl.LazyFrame, uf: str) -> pl.Series:
    """Notas de Matemática válidas (não nulas, finitas, em [0, 1000]) da UF."""
    nota = pl.col(COLUNA_NOTA).cast(pl.Float64, strict=False)
    df = (
        resultados
        .filter(_filtro_uf(uf))
        .select(nota.alias("nota"))
        .collect()
    )
    return df.filter(
        pl.col("nota").is_not_null()
        & pl.col("nota").is_finite()
        & (pl.col("nota") >= NOTA_MINIMA)
        & (pl.col("nota") <= NOTA_MAXIMA)
    ).get_column("nota")


# ---------------------------------------------------------------------------
# Camada 2 — composição por faixa etária
# ---------------------------------------------------------------------------
def calcular_composicao_etaria(
    participantes: pl.DataFrame | pl.LazyFrame, uf: str
) -> dict:
    """Agrega TP_FAIXA_ETARIA dos inscritos da UF.

    Diferente do Filtro 4 (TP_DEPENDENCIA_ADM_ESC), TP_FAIXA_ETARIA é
    autodeclarada na inscrição e não tem lacuna real (ver validação em
    docs/dicionario_dados.md) -- mesmo assim, um código fora de 1-20 ou
    nulo é tratado como "não previsto" em vez de presumido, seguindo a
    mesma disciplina do Filtro 4.
    """
    lf = _como_lazy(participantes, COLUNAS_PARTICIPANTES, "participantes").filter(_filtro_uf(uf))

    codigo_texto = pl.col(COLUNA_FAIXA).cast(pl.String).str.strip_chars()
    agregado = (
        lf.select(
            codigo_texto.alias("bruto"),
            codigo_texto.cast(pl.Int64, strict=False).alias("codigo"),
        )
        .group_by("bruto", "codigo")
        .agg(pl.len().alias("quantidade"))
        .collect()
    )

    total = int(agregado.get_column("quantidade").sum() or 0) if agregado.height else 0
    if total == 0:
        raise UFsemDadosError(
            "Não existem registros de participantes para a UF selecionada na base de referência."
        )

    contagem_codigo: dict[int, int] = {}
    sem_informacao = 0
    nao_previstos: dict[str, int] = {}
    for linha in agregado.iter_rows(named=True):
        bruto, codigo, qtd = linha["bruto"], linha["codigo"], int(linha["quantidade"])
        if bruto is None or bruto == "":
            sem_informacao += qtd
        elif codigo is not None and codigo in FAIXAS_ETARIAS:
            contagem_codigo[codigo] = contagem_codigo.get(codigo, 0) + qtd
        else:
            nao_previstos[bruto] = nao_previstos.get(bruto, 0) + qtd

    total_validos = sum(contagem_codigo.values())

    categorias = []
    for codigo in sorted(FAIXAS_ETARIAS):
        qtd = contagem_codigo.get(codigo, 0)
        categorias.append({
            "codigo": codigo,
            "rotulo": FAIXAS_ETARIAS[codigo],
            "quantidade": qtd,
            "percentual_validos": _percentual(qtd, total_validos),
            "percentual_total": _percentual(qtd, total),
        })

    excluidos = []
    if sem_informacao:
        excluidos.append({
            "chave": "sem_informacao", "codigo": None,
            "rotulo": "Sem informação",
            "quantidade": sem_informacao, "percentual_total": _percentual(sem_informacao, total),
        })
    for bruto, qtd in sorted(nao_previstos.items()):
        excluidos.append({
            "chave": "codigo_nao_previsto", "codigo": bruto,
            "rotulo": f"Código não previsto no mapeamento ({bruto})",
            "quantidade": qtd, "percentual_total": _percentual(qtd, total),
        })

    if total_validos == 0:
        raise UFsemDadosError(
            "Nenhum registro de participantes da UF possui faixa etária "
            "classificada em um dos 20 códigos oficiais; não é possível calcular a composição."
        )

    return {
        "total_inscritos": total,
        "total_validos": total_validos,
        "total_excluidos": total - total_validos,
        "categorias": categorias,
        "excluidos": excluidos,
    }


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def analisar_faixa_etaria(
    estado: str,
    nota_matematica: float,
    resultados: pl.DataFrame | pl.LazyFrame | None = None,
    participantes: pl.DataFrame | pl.LazyFrame | None = None,
) -> dict:
    """Calcula percentil nota×UF e composição por faixa etária da UF, de forma independente."""
    if not isinstance(estado, str) or estado.strip().upper() not in UFS_VALIDAS:
        raise ValueError("Informe uma UF brasileira válida.")
    uf = estado.strip().upper()

    if isinstance(nota_matematica, bool) or not isinstance(nota_matematica, (int, float)):
        raise ValueError("A nota deve ser numérica.")
    nota = float(nota_matematica)
    if not math.isfinite(nota) or not NOTA_MINIMA <= nota <= NOTA_MAXIMA:
        raise ValueError("A nota deve ser um número finito entre 0 e 1000.")

    lf_resultados = (
        _como_lazy(resultados, COLUNAS_RESULTADOS, "resultados")
        if resultados is not None else abrir_resultados()
    )
    lf_participantes = (
        _como_lazy(participantes, COLUNAS_PARTICIPANTES, "participantes")
        if participantes is not None else abrir_participantes()
    )

    notas = obter_notas_uf(lf_resultados, uf)
    if notas.len() == 0:
        raise UFsemDadosError(
            f"Não existem notas válidas de Matemática para {uf} na base de referência."
        )
    percentil = calcular_percentil(nota, notas)
    try:
        zscore: float | None = calcular_zscore(nota, notas)
        motivo_zscore = None
    except ValueError:
        zscore = None
        motivo_zscore = "Z-Score indisponível: todas as notas válidas deste recorte são iguais."

    composicao = calcular_composicao_etaria(lf_participantes, uf)

    return {
        "ano_referencia": ANO_REFERENCIA,
        "estado_referencia": uf,
        "desempenho": {
            "area_referencia": "Matemática",
            "variavel_nota": COLUNA_NOTA,
            "nota_usuario": round(nota, 2),
            "percentil_usuario": round(float(percentil), 2),
            "zscore_usuario": None if zscore is None else round(float(zscore), 4),
            "total_notas_validas_uf": int(notas.len()),
            "observacao_zscore": motivo_zscore,
        },
        "composicao_etaria": composicao,
        "nota_metodologica": (
            "O percentil/Z-Score comparam a nota informada apenas com as notas "
            "válidas de Matemática (NU_NOTA_MT) da UF (SG_UF_PROVA), fonte "
            "RESULTADOS. A composição por faixa etária (TP_FAIXA_ETARIA) é uma "
            "estatística descritiva SEPARADA da mesma UF, fonte PARTICIPANTES: "
            "os microdados do ENEM não têm chave que ligue participante e nota "
            "(NU_SEQUENCIAL != NU_INSCRICAO), então a nota não é atribuída a "
            "nenhuma faixa etária específica."
        ),
    }
