"""
etl/ingestion.py
-----------------
Script de extração/ingestão dos microdados do ENEM usando Polars.

Por que Polars e não Pandas?
- Pandas carrega o DataFrame inteiro na memória RAM de uma vez, e os
  microdados do INEP têm 3GB+ (às vezes bem mais, dependendo do ano).
  Isso trava máquinas comuns (OOM = Out Of Memory).
- Polars é escrito em Rust, processa em paralelo e tem um modo "lazy"
  (não usado ainda aqui, mas será essencial na ingestão completa) que
  permite processar arquivos maiores que a RAM disponível.

Este script, por enquanto, só lê uma AMOSTRA pequena (100 linhas) pra
validar o schema e o pipeline de ponta a ponta antes de rodar com o
arquivo completo.
"""

from pathlib import Path

import polars as pl

# Path(__file__) é o caminho deste próprio arquivo (ingestion.py).
# .parent pega a pasta que o contém (etl/). Usar isso, em vez de uma
# string solta como "microdados.csv", garante que o caminho funcione
# não importa de onde o script seja executado (da raiz do projeto,
# de dentro de etl/, do VS Code, etc.) — resolve o FileNotFoundError
# que você teve.
PASTA_ETL = Path(__file__).parent

# ATENÇÃO: o .zip do INEP extraiu com uma pasta duplicada dentro dela
# mesma (microdados_enem_2025/microdados_enem_2025/...) — isso é comum
# quando o zip já vem com uma pasta interna de mesmo nome. Testando
# primeiro com PARTICIPANTES_2025.csv (dados de perfil/inscrição).
CAMINHO_CSV_BRUTO = (
    PASTA_ETL
    / "microdados_enem_2025"
    / "microdados_enem_2025"
    / "DADOS"
    / "PARTICIPANTES_2025.csv"
)
CAMINHO_PARQUET_SAIDA = PASTA_ETL / "trusted_amostra.parquet"


def ler_amostra_microdados(caminho_csv: Path, n_linhas: int = 100) -> pl.DataFrame:
    """
    Lê apenas as primeiras `n_linhas` do CSV bruto do INEP.

    Detalhes importantes dos parâmetros:
    - separator=";"  → os microdados do INEP usam ponto-e-vírgula como
      separador de colunas (padrão comum em arquivos de origem brasileira,
      já que a vírgula é usada como separador decimal).
    - encoding="latin1" → os arquivos do INEP normalmente NÃO vêm em UTF-8;
      vêm em Latin-1 (também chamado ISO-8859-1). Se você tentar ler como
      UTF-8, vai dar erro de decodificação em qualquer acento (ex: "Município").
    - n_rows=100 → ATENÇÃO: no Polars o parâmetro se chama `n_rows`,
      não `nrows` como no Pandas. É um erro comum na migração entre as
      duas bibliotecas. Isso evita carregar o arquivo de 3GB+ inteiro
      só para testar se o pipeline funciona.
    """
    if not caminho_csv.exists():
        # Checagem explícita antes de tentar ler: se o caminho estiver
        # errado (arquivo movido, nome diferente, etc.), a mensagem de
        # erro já mostra o caminho completo que foi procurado, em vez
        # de um FileNotFoundError genérico do sistema operacional.
        raise FileNotFoundError(
            f"CSV não encontrado em: {caminho_csv.resolve()}\n"
            "Confira se o caminho em CAMINHO_CSV_BRUTO bate com a "
            "estrutura de pastas real do seu microdado extraído."
        )

    df = pl.read_csv(
        caminho_csv,
        separator=";",
        encoding="latin1",
        n_rows=n_linhas,
    )
    return df


def salvar_amostra_parquet(df: pl.DataFrame, caminho_saida: Path) -> None:
    """
    Converte a amostra para Parquet.

    Por que Parquet e não CSV?
    - Formato colunar: leitura seletiva de colunas é muito mais rápida.
    - Compressão nativa: ocupa uma fração do espaço do CSV original.
    - Mantém os tipos de dados (int, float, string) sem precisar
      reconverter toda vez que o arquivo é lido de novo.
    """
    df.write_parquet(caminho_saida)


def main():
    print(f"Lendo amostra de '{CAMINHO_CSV_BRUTO}'...")
    df_amostra = ler_amostra_microdados(CAMINHO_CSV_BRUTO, n_linhas=100)
    print(f"Amostra lida: {df_amostra.height} linhas x {df_amostra.width} colunas.")

    print("\nSchema dos dados (nome da coluna -> tipo inferido pelo Polars):")
    print(df_amostra.schema)

    print(f"\nSalvando amostra em '{CAMINHO_PARQUET_SAIDA}'...")
    salvar_amostra_parquet(df_amostra, CAMINHO_PARQUET_SAIDA)

    print("Concluído.")


if __name__ == "__main__":
    # Esse bloco só roda quando o arquivo é executado diretamente
    # (python etl/ingestion.py), e não quando é importado por outro módulo.
    main()