"""
etl/ingestion.py
-----------------
Versao de PRODUCAO da ingestao dos microdados do ENEM (ticket #34).

Gera dois arquivos Parquet (nao um so), porque RESULTADOS_2025.csv e
PARTICIPANTES_2025.csv tem granularidades diferentes e NAO sao juntaveis
(confirmado oficialmente no #33/#42 -- ausencia de chave de ligacao por
decisao de LGPD). Confirmado com o Felipe (27/09): misturar os dois num
arquivo só seria enganoso, sem chave de junção. Entregáveis separados:

  - resultados_2025.parquet    -> Camada 1: nota x UF (percentil real)
  - participantes_2025.parquet -> Camada 2: composicao demografica (sem nota)

As 5 notas (CN, CH, LC, MT, Redação) entram no Parquet de resultados,
não só Matemática -- confirmado pelo Felipe: a Camada 1 é compartilhada
por todos os módulos futuros, não só a Trilha de Gênero.
"""

from pathlib import Path

import polars as pl

# --- Caminhos -----------------------------------------------------------

PASTA_ETL = Path(__file__).parent
PASTA_DADOS_BRUTOS = PASTA_ETL / "microdados_enem_2025" / "microdados_enem_2025" / "DADOS"
PASTA_SAIDA = PASTA_ETL / "producao"

CAMINHO_RESULTADOS_CSV = PASTA_DADOS_BRUTOS / "RESULTADOS_2025.csv"
CAMINHO_PARTICIPANTES_CSV = PASTA_DADOS_BRUTOS / "PARTICIPANTES_2025.csv"

CAMINHO_RESULTADOS_PARQUET = PASTA_SAIDA / "resultados_2025.parquet"
CAMINHO_PARTICIPANTES_PARQUET = PASTA_SAIDA / "participantes_2025.parquet"

# --- Colunas selecionadas -------------------------------------------------
# Reduzir as colunas JA na leitura do CSV (via `columns=`) economiza
# memoria, porque o Polars nao aloca espaco para as colunas descartadas.

COLUNAS_RESULTADOS = [
    "SG_UF_PROVA",
    "NU_NOTA_CN",
    "NU_NOTA_CH",
    "NU_NOTA_LC",
    "NU_NOTA_MT",
    "NU_NOTA_REDACAO",
    # AV4 / Issue #51: presenca em Matematica e dependencia administrativa da
    # escola de conclusao. Ambas vivem na base de RESULTADOS (mesma linha da
    # nota), permitindo calcular percentil e composicao publica/privada por UF
    # sem juncao com PARTICIPANTES. Ver docs/filtro_tipo_escola_av4.md.
    "TP_PRESENCA_MT",
    "TP_DEPENDENCIA_ADM_ESC",
]

# Escopo atual: so as colunas ja mapeadas oficialmente no #33/#42.
# As colunas demograficas dos outros 3 modulos (Abismo Digital, Peso do
# CEP, Equidade de Escolas) ainda nao tem dicionario proprio -- quando
# tiverem, essa lista cresce.
COLUNAS_PARTICIPANTES = [
    "SG_UF_PROVA",
    "TP_SEXO",
]

# Tipos forcados na leitura dos RESULTADOS (AV4 / Issue #51).
# TP_DEPENDENCIA_ADM_ESC e lido como texto para preservar o codigo bruto do
# INEP (1=Federal, 2=Estadual, 3=Municipal, 4=Privada; vazio quando a escola
# nao foi identificada no Censo): sem isso, a inferencia de tipo (feita sobre as
# primeiras linhas) poderia falhar ou converter valores inesperados. A
# classificacao publica/privada (e o tratamento de valores sem informacao e
# codigos nao previstos) fica em core/escola.py.
TIPOS_RESULTADOS = {"TP_DEPENDENCIA_ADM_ESC": pl.String}

# Defina um numero aqui (ex: 1000) para testes rapidos sem processar o
# arquivo inteiro. Deixe None para a execucao de producao (arquivo
# completo) -- e o que o ticket #34 pede.
LIMITE_LINHAS_DEV: int | None = None


def ler_csv_producao(
    caminho_csv: Path,
    colunas: list[str],
    n_linhas: int | None,
    tipos: dict | None = None,
) -> pl.DataFrame:
    """
    Le o CSV bruto do INEP selecionando so as colunas necessarias.

    - separator=";" e encoding="latin1": padrao do INEP, ja usado desde
      o #27/#33.
    - columns=colunas: instrui o Polars a nao alocar memoria para as
      colunas que nao vamos usar -- essencial pra rodar sobre o arquivo
      completo (3GB+) sem estourar a RAM.
    - n_rows=n_linhas: so aplicado se n_linhas nao for None (modo dev).
      Em producao (n_linhas=None), le o arquivo inteiro.
    - tipos: dtypes forcados por coluna (schema_overrides). Opcional e com
      default None para preservar as chamadas existentes (ex.: PARTICIPANTES,
      que nao forca tipos). Usado pelos RESULTADOS para ler
      TP_DEPENDENCIA_ADM_ESC como texto (AV4 / Issue #51).
    """
    kwargs = dict(separator=";", encoding="latin1", columns=colunas)
    if n_linhas is not None:
        kwargs["n_rows"] = n_linhas
    if tipos is not None:
        kwargs["schema_overrides"] = tipos
    return pl.read_csv(caminho_csv, **kwargs)


def gerar_parquet_producao(df: pl.DataFrame, caminho_saida: Path) -> None:
    """
    Salva o DataFrame em Parquet com compressao zstd.

    zstd foi escolhido (em vez de snappy) por comprimir mais o arquivo
    final, com custo de CPU pequeno -- bom trade-off aqui porque este
    arquivo e escrito uma vez e lido raramente (so no deploy).
    """
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(caminho_saida, compression="zstd")


def imprimir_volumetria(nome: str, df: pl.DataFrame, caminho_arquivo: Path) -> None:
    """
    Registra as informacoes que alimentam o Relatorio Tecnico de
    Engenharia de Dados (AV3): quantidade de linhas/colunas e tamanho
    final do arquivo gerado.
    """
    tamanho_mb = caminho_arquivo.stat().st_size / (1024 * 1024)
    print(f"\n[{nome}]")
    print(f"  Linhas:  {df.height:,}")
    print(f"  Colunas: {df.width} -> {df.columns}")
    print(f"  Arquivo: {caminho_arquivo}")
    print(f"  Tamanho: {tamanho_mb:.2f} MB (compressao zstd)")


def main():
    modo = "DEV (amostra)" if LIMITE_LINHAS_DEV is not None else "PRODUCAO (arquivo completo)"
    print(f"Modo de execucao: {modo}\n")

    # --- Camada 1: RESULTADOS (nota x UF + dependencia administrativa) ---
    print(f"Lendo '{CAMINHO_RESULTADOS_CSV.name}'...")
    df_resultados = ler_csv_producao(
        CAMINHO_RESULTADOS_CSV, COLUNAS_RESULTADOS, LIMITE_LINHAS_DEV,
        TIPOS_RESULTADOS,
    )
    gerar_parquet_producao(df_resultados, CAMINHO_RESULTADOS_PARQUET)

    # --- Camada 2: PARTICIPANTES (composicao demografica) ---
    print(f"Lendo '{CAMINHO_PARTICIPANTES_CSV.name}'...")
    df_participantes = ler_csv_producao(
        CAMINHO_PARTICIPANTES_CSV, COLUNAS_PARTICIPANTES, LIMITE_LINHAS_DEV
    )
    gerar_parquet_producao(df_participantes, CAMINHO_PARTICIPANTES_PARQUET)

    # --- Volumetria final (pra AV3) ---
    print("\n" + "=" * 60)
    print("VOLUMETRIA FINAL")
    print("=" * 60)
    imprimir_volumetria("RESULTADOS", df_resultados, CAMINHO_RESULTADOS_PARQUET)
    imprimir_volumetria("PARTICIPANTES", df_participantes, CAMINHO_PARTICIPANTES_PARQUET)

    print("\nConcluido. Os dois arquivos estao em:", PASTA_SAIDA)
    print("Lembrete: NAO commitar esses .parquet (ja cobertos pelo .gitignore).")
    print("Proximo passo: entregar os dois arquivos ao Felipe para upload no Azure Blob Storage.")


if __name__ == "__main__":
    main()