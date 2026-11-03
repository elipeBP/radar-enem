"""Lógica de negócio do Filtro 4 — Tipo de Escola (AV4, issue #51).

Duas análises INDEPENDENTES são calculadas para a UF escolhida, ambas a partir
do arquivo ``resultados_2025.parquet`` (mesma linha da nota), sem junção com a
base de participantes:

1. Camada A — Desempenho (nota × UF): percentil da nota de Matemática informada
   frente às notas válidas de ``NU_NOTA_MT`` dos participantes PRESENTES
   (``TP_PRESENCA_MT == 1``) com ``SG_UF_PROVA`` igual à UF.

2. Camada B — Composição (dependência administrativa × UF): contagem e
   percentual de ``TP_DEPENDENCIA_ADM_ESC`` entre os registros de resultados da
   UF. Pública = Federal (1) + Estadual (2) + Municipal (3); Privada = (4).

Fonte oficial do mapeamento: ``Dicionario/Dicionário_Microdados_Enem_2025.xlsx``
(aba ``RESULTADOS_2025``): ``TP_DEPENDENCIA_ADM_ESC`` — "Dependência
administrativa (Escola)" — 1=Federal, 2=Estadual, 3=Municipal, 4=Privada. A
coluna vem de ``CO_ESCOLA``, obtida da base de matrículas do Censo Escolar; por
isso só está preenchida para quem teve a escola de conclusão identificada
(tipicamente concluintes), e fica vazia nos demais. Essa limitação é medida e
reportada como ``cobertura`` (ver ``calcular_composicao_escolar``).

Não há junção entre PARTICIPANTES e RESULTADOS: o dicionário oficial do INEP
2025 declara que ``NU_SEQUENCIAL`` (resultados) é distinto de ``NU_INSCRICAO``
(participantes) e não permite relacionar as bases. As duas camadas acima saem
do mesmo arquivo, mas permanecem estatísticas SEPARADAS: a dependência da escola
não é atribuída à nota informada, nem usada para comparar redes.

Leitura dos dados: ``pl.scan_parquet`` (lazy) com projeção de colunas e filtro
por UF empurrados para o leitor, evitando carregar os ~4,8 milhões de linhas
em memória a cada requisição.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import polars as pl

from core.estatistica import calcular_percentil

# ---------------------------------------------------------------------------
# Localização dos Parquets
# ---------------------------------------------------------------------------
PASTA_BACKEND = Path(__file__).resolve().parents[1]
# A variável de ambiente permite apontar para outra pasta (ex.: deploy ou
# testes com dados sintéticos) sem alterar código.
PASTA_PARQUET = Path(
    os.environ.get("RADAR_ENEM_PASTA_PARQUET", PASTA_BACKEND / "etl" / "producao")
)
NOME_RESULTADOS = "resultados_2025.parquet"
NOME_PARTICIPANTES = "participantes_2025.parquet"

COLUNAS_RESULTADOS = {
    "SG_UF_PROVA", "NU_NOTA_MT", "TP_PRESENCA_MT", "TP_DEPENDENCIA_ADM_ESC",
}

ANO_REFERENCIA = 2025
NOTA_MINIMA = 0.0
NOTA_MAXIMA = 1000.0
# TP_PRESENCA_MT (RESULTADOS_2025): 0=Faltou, 1=Presente, 2=Eliminado.
PRESENCA_PRESENTE = 1

# ---------------------------------------------------------------------------
# Mapeamento de TP_DEPENDENCIA_ADM_ESC (dependência administrativa da escola)
# ---------------------------------------------------------------------------
# Fonte oficial CONFIRMADA no dicionário local da edição 2025
# (Dicionario/Dicionário_Microdados_Enem_2025.xlsx, aba RESULTADOS_2025):
#   TP_DEPENDENCIA_ADM_ESC = "Dependência administrativa (Escola)"
#   1 = Federal | 2 = Estadual | 3 = Municipal | 4 = Privada
#
# Agrupamento do Filtro 4: pública = {1,2,3}; privada = {4}. Qualquer outro
# código documentado em edições futuras seria "não previsto" (fora do
# denominador válido). Valor vazio/nulo = "sem informação" (escola de conclusão
# não identificada no Censo Escolar), também fora do denominador válido.
MAPEAMENTO_CONFIRMADO = True
FONTE_MAPEAMENTO = (
    "TP_DEPENDENCIA_ADM_ESC (dependência administrativa da escola), base de "
    "RESULTADOS do ENEM 2025: 1=Federal, 2=Estadual, 3=Municipal, 4=Privada. "
    "Fonte: Dicionário_Microdados_Enem_2025.xlsx (aba RESULTADOS_2025). "
    "Pública = 1+2+3; Privada = 4."
)

# codigo -> (chave, rótulo, entra no denominador válido?)
CATEGORIAS_DEPENDENCIA: dict[int, tuple[str, str, bool]] = {
    1: ("publica", "Escola pública", True),   # Federal
    2: ("publica", "Escola pública", True),   # Estadual
    3: ("publica", "Escola pública", True),   # Municipal
    4: ("privada", "Escola privada", True),   # Privada
}

# Grupos válidos agregados, na ordem de exibição. Cada grupo soma os códigos
# oficiais acima que compartilham a mesma chave.
GRUPOS_VALIDOS: list[tuple[str, str, tuple[int, ...]]] = [
    ("publica", "Escola pública", (1, 2, 3)),
    ("privada", "Escola privada", (4,)),
]


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


def _como_lazy(df: pl.DataFrame | pl.LazyFrame, obrigatorias: set[str], nome: str) -> pl.LazyFrame:
    lf = df.lazy() if isinstance(df, pl.DataFrame) else df
    _validar_colunas(lf.collect_schema().names(), obrigatorias, nome)
    return lf


def _filtro_uf(uf: str) -> pl.Expr:
    return pl.col("SG_UF_PROVA").cast(pl.String).str.strip_chars().str.to_uppercase() == uf


def _percentual(quantidade: int, total: int) -> float | None:
    """Percentual com 2 casas; None quando o denominador é zero."""
    if total <= 0:
        return None
    return round(quantidade / total * 100, 2)


# ---------------------------------------------------------------------------
# Camada 1 — notas
# ---------------------------------------------------------------------------
def obter_notas_uf(resultados: pl.LazyFrame, uf: str) -> tuple[pl.Series, int]:
    """Retorna (notas válidas de Matemática da UF entre presentes, excluídos).

    População de referência: participantes PRESENTES na prova de Matemática
    (``TP_PRESENCA_MT == 1``) com ``SG_UF_PROVA`` igual à UF.

    Critério de inclusão da nota: NU_NOTA_MT não nula, numérica, finita e dentro
    de [0, 1000]. Registros da UF que faltaram/foram eliminados, ou cuja nota é
    nula, não-finita ou fora da escala, são contados como excluídos e não entram
    na população. Filtrar por presença evita incluir zeros de ausentes.
    """
    nota = pl.col("NU_NOTA_MT").cast(pl.Float64, strict=False)
    presenca = pl.col("TP_PRESENCA_MT").cast(pl.Int64, strict=False)
    presente = presenca == PRESENCA_PRESENTE
    nota_valida = (
        nota.is_not_null()
        & nota.is_finite()
        & (nota >= NOTA_MINIMA)
        & (nota <= NOTA_MAXIMA)
    )
    valida = (presente & nota_valida).fill_null(False)
    df = (
        resultados
        .filter(_filtro_uf(uf))
        .select(nota.alias("nota"), valida.alias("valida"))
        .collect()
    )
    notas = df.filter(pl.col("valida")).get_column("nota")
    excluidas = df.height - notas.len()
    return notas, excluidas


# ---------------------------------------------------------------------------
# Camada 2 — composição por tipo de escola
# ---------------------------------------------------------------------------
def calcular_composicao_escolar(
    resultados: pl.DataFrame | pl.LazyFrame, uf: str | None = None
) -> dict:
    """Agrega TP_DEPENDENCIA_ADM_ESC dos resultados (opcionalmente por UF).

    Agrupamento (fonte: dicionário oficial 2025, aba RESULTADOS_2025):
    - pública = Federal (1) + Estadual (2) + Municipal (3);
    - privada = Privada (4).

    Denominadores explícitos:
    - ``total_registros_uf``: todas as linhas de resultados da UF;
    - ``total_validos``: registros classificados como pública ou privada. É o
      denominador de ``percentual_validos``;
    - ``cobertura`` = ``total_validos / total_registros_uf × 100``: proporção de
      registros de resultados da UF com dependência administrativa classificada.
      NÃO é cobertura de todos os inscritos/presentes — apenas de quem teve a
      escola de conclusão identificada no Censo Escolar.
    Registros sem informação (vazio/nulo) e códigos não previstos ficam fora do
    denominador válido e são reportados em ``excluidos``.
    """
    lf = _como_lazy(resultados, COLUNAS_RESULTADOS, "resultados")
    if uf is not None:
        lf = lf.filter(_filtro_uf(uf))

    codigo_texto = pl.col("TP_DEPENDENCIA_ADM_ESC").cast(pl.String).str.strip_chars()
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
            "Não existem registros de resultados para a UF selecionada na base de referência."
        )

    contagem_codigo: dict[int, int] = {}
    sem_informacao = 0
    nao_previstos: dict[str, int] = {}
    for linha in agregado.iter_rows(named=True):
        bruto, codigo, qtd = linha["bruto"], linha["codigo"], int(linha["quantidade"])
        if bruto is None or bruto == "":
            sem_informacao += qtd
        elif codigo is not None and codigo in CATEGORIAS_DEPENDENCIA:
            contagem_codigo[codigo] = contagem_codigo.get(codigo, 0) + qtd
        else:
            nao_previstos[bruto] = nao_previstos.get(bruto, 0) + qtd

    # total_validos = soma de todos os códigos mapeados como pública ou privada.
    total_validos = sum(contagem_codigo.values())

    # Agrega os códigos oficiais por grupo (pública = 1+2+3; privada = 4).
    categorias = []
    for chave, rotulo, codigos in GRUPOS_VALIDOS:
        qtd = sum(contagem_codigo.get(cod, 0) for cod in codigos)
        categorias.append({
            "chave": chave,
            "codigos": list(codigos),
            "rotulo": rotulo,
            "quantidade": qtd,
            "percentual_validos": _percentual(qtd, total_validos),
            "percentual_total": _percentual(qtd, total),
        })

    excluidos = [{
        "chave": "sem_informacao", "codigo": None,
        "rotulo": "Sem informação (escola não identificada no Censo)",
        "quantidade": sem_informacao, "percentual_total": _percentual(sem_informacao, total),
    }]
    for bruto, qtd in sorted(nao_previstos.items()):
        excluidos.append({
            "chave": "codigo_nao_previsto", "codigo": bruto,
            "rotulo": f"Código não previsto no mapeamento ({bruto})",
            "quantidade": qtd, "percentual_total": _percentual(qtd, total),
        })

    if total_validos == 0:
        raise UFsemDadosError(
            "Nenhum registro de resultados da UF possui dependência administrativa "
            "classificada como pública ou privada; não é possível calcular a composição."
        )

    return {
        "total_registros_uf": total,
        "total_validos": total_validos,
        "total_excluidos": total - total_validos,
        "cobertura": _percentual(total_validos, total),
        "categorias": categorias,
        "excluidos": excluidos,
        "mapeamento_confirmado": MAPEAMENTO_CONFIRMADO,
        "fonte_mapeamento": FONTE_MAPEAMENTO,
    }


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def analisar_tipo_escola(
    estado: str,
    nota_matematica: float,
    resultados: pl.DataFrame | pl.LazyFrame | None = None,
) -> dict:
    """Calcula percentil nota×UF e composição escolar da UF, de forma independente.

    Ambas as análises saem do arquivo de RESULTADOS, filtrado por UF, sem junção
    com a base de participantes. O DataFrame opcional permite testes controlados
    com dados sintéticos.
    """
    if not isinstance(nota_matematica, (int, float)) or isinstance(nota_matematica, bool):
        raise TypeError("nota_matematica deve ser numérica.")
    nota = float(nota_matematica)
    if not math.isfinite(nota) or not NOTA_MINIMA <= nota <= NOTA_MAXIMA:
        raise ValueError("nota_matematica deve ser um número finito entre 0 e 1000.")
    uf = estado.strip().upper()

    lf_resultados = (
        _como_lazy(resultados, COLUNAS_RESULTADOS, "resultados")
        if resultados is not None else abrir_resultados()
    )

    notas, notas_excluidas = obter_notas_uf(lf_resultados, uf)
    if notas.len() == 0:
        raise UFsemDadosError(
            f"Não existem notas válidas de Matemática entre os presentes de {uf} "
            "na base de referência."
        )
    percentil = calcular_percentil(nota, notas)
    composicao = calcular_composicao_escolar(lf_resultados, uf)

    return {
        "ano_referencia": ANO_REFERENCIA,
        "estado_referencia": uf,
        "desempenho": {
            "area_referencia": "Matemática",
            "variavel_nota": "NU_NOTA_MT",
            "nota_usuario": round(nota, 2),
            "percentil_usuario": round(float(percentil), 2),
            "total_notas_validas_uf": int(notas.len()),
            "registros_sem_nota_valida_uf": int(notas_excluidas),
            "metodo_percentil": (
                "Percentil de posição com empates pela metade: "
                "(nº de notas menores + 0,5 × nº de notas iguais) ÷ nº de notas válidas × 100. "
                "População: participantes presentes em Matemática (TP_PRESENCA_MT = 1) na UF."
            ),
        },
        "composicao_escolar": composicao,
        "nota_metodologica": (
            "O percentil compara a nota informada apenas com as notas válidas de "
            "Matemática (NU_NOTA_MT) de quem esteve presente na prova (TP_PRESENCA_MT = 1) "
            "na UF (SG_UF_PROVA). A composição por dependência administrativa "
            "(TP_DEPENDENCIA_ADM_ESC) é uma estatística descritiva separada da mesma UF: "
            "ela descreve os registros cuja escola de conclusão foi identificada no Censo "
            "Escolar (ver cobertura) e NÃO é atribuída à nota informada. Os microdados de "
            "2025 não têm chave que ligue participante e nota, então não se compara o "
            "desempenho de escolas públicas e privadas."
        ),
    }
