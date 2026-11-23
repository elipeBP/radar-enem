"""
core/genero.py
---------------
Regra de negócio do módulo "Trilha de Gênero nas Exatas" (#37).

A análise devolve DUAS informações independentes, de fontes diferentes:

  1. nota x UF (fonte: RESULTADOS_<ano>): onde a nota de Matemática do
     usuário se posiciona (percentil / Z-Score) entre os participantes
     das UFs escolhidas.
  2. composição demográfica (fonte: PARTICIPANTES_<ano>): % de mulheres
     entre os inscritos nas UFs escolhidas.

Elas NÃO são cruzadas: o INEP não publica chave de ligação entre os dois
arquivos (LGPD, ver #33/#42), então não existe "nota das mulheres" nos
dados públicos. Por isso a resposta mantém os dois blocos separados e
traz um aviso explícito.

A função recebe os DataFrames já carregados em memória (#36, via
app.state) -- não lê arquivo nenhum, então é barata e fácil de testar.
"""

import polars as pl

from core.estatistica import calcular_percentil, calcular_zscore

# Anos com microdados ingeridos e disponíveis para consulta (#17). Cada ano
# novo exige rodar o ETL (etl/ingestion.py) pra gerar o par de Parquets
# correspondente -- ver docs/dicionario_dados.md.
ANOS_DISPONIVEIS = frozenset({2024, 2025})
ANO_PADRAO = 2025

COL_UF = "SG_UF_PROVA"
COL_NOTA = "NU_NOTA_MT"
COL_SEXO = "TP_SEXO"


def _aviso_fontes(ano: int) -> str:
    return (
        f"Os dois blocos vêm de arquivos diferentes do INEP e não são cruzados: "
        f"'nota_por_uf' usa RESULTADOS_{ano} e 'composicao_demografica' usa "
        f"PARTICIPANTES_{ano}. Os microdados públicos não permitem ligar o sexo "
        f"de um participante à sua nota (LGPD), então isto não é uma comparação "
        f"de desempenho entre homens e mulheres. O estado considerado é a UF "
        f"onde a prova foi realizada."
    )


class AnoIndisponivelError(ValueError):
    """O ano pedido não tem microdados carregados."""


class EstadosSemDadosError(ValueError):
    """Os estados pedidos não têm registros suficientes para a análise."""


def analisar_genero(
    df_resultados: pl.DataFrame,
    df_participantes: pl.DataFrame,
    *,
    ano: int,
    estados: list[str],
    nota_usuario: float,
) -> dict:
    """
    Calcula a análise da Trilha de Gênero para as UFs informadas.

    Quando há mais de uma UF, a população é a soma delas (um único
    grupo), não uma média de médias.

    Levanta:
      - AnoIndisponivelError: `ano` fora de ANOS_DISPONIVEIS.
      - EstadosSemDadosError: nenhuma nota ou nenhum inscrito nas UFs.
    """
    if ano not in ANOS_DISPONIVEIS:
        anos_lista = ", ".join(str(a) for a in sorted(ANOS_DISPONIVEIS))
        raise AnoIndisponivelError(
            f"Só há microdados de {anos_lista} carregados (pedido: {ano})."
        )

    # --- Bloco 1: nota x UF (RESULTADOS) ----------------------------------
    # drop_nulls é essencial: quem faltou à prova tem nota vazia. Sem
    # descartar, o motor estatístico contaria essas pessoas no tamanho da
    # população e o percentil sairia deslocado.
    serie_nota = (
        df_resultados.filter(pl.col(COL_UF).is_in(estados))
        .get_column(COL_NOTA)
        .drop_nulls()
    )
    if serie_nota.len() == 0:
        raise EstadosSemDadosError(
            f"Nenhuma nota de Matemática encontrada para {', '.join(estados)}."
        )

    try:
        percentil = calcular_percentil(nota_usuario, serie_nota)
        zscore = calcular_zscore(nota_usuario, serie_nota)
    except ValueError as exc:  # ex.: todas as notas iguais -> desvio zero
        raise EstadosSemDadosError(str(exc)) from exc

    nota_por_uf = {
        "fonte": f"RESULTADOS_{ano}",
        "nota_usuario": nota_usuario,
        "percentil_usuario": round(percentil, 2),
        "zscore_usuario": round(zscore, 3),
        "media_grupo_filtrado": round(float(serie_nota.mean()), 2),
        "desvio_padrao_grupo": round(float(serie_nota.std(ddof=0)), 2),
        "total_participantes_com_nota": serie_nota.len(),
    }

    # --- Bloco 2: composição demográfica (PARTICIPANTES, sem nota) ---------
    sexo = (
        df_participantes.filter(
            pl.col(COL_UF).is_in(estados) & pl.col(COL_SEXO).is_in(["F", "M"])
        )
        .get_column(COL_SEXO)
    )
    total_inscritos = sexo.len()
    if total_inscritos == 0:
        raise EstadosSemDadosError(
            f"Nenhum inscrito encontrado para {', '.join(estados)}."
        )

    mulheres = int((sexo == "F").sum())
    homens = total_inscritos - mulheres

    composicao = {
        "fonte": f"PARTICIPANTES_{ano}",
        "total_inscritos": total_inscritos,
        "inscritas_mulheres": mulheres,
        "inscritos_homens": homens,
        "percentual_mulheres": round(mulheres / total_inscritos * 100, 2),
        "percentual_homens": round(homens / total_inscritos * 100, 2),
    }

    return {
        "ano_referencia": ano,
        "estados_referencia": list(estados),
        # Atalhos mantidos por compatibilidade com o frontend do #41, que
        # lia estes dois campos na raiz quando a rota era mock. Podem sair
        # quando o frontend passar a ler 'nota_por_uf'.
        "percentil_usuario": nota_por_uf["percentil_usuario"],
        "media_grupo_filtrado": nota_por_uf["media_grupo_filtrado"],
        "nota_por_uf": nota_por_uf,
        "composicao_demografica": composicao,
        "aviso": _aviso_fontes(ano),
    }