"""
Script exploratório - Radar ENEM
Objetivo: dar uma primeira olhada no arquivo de Microdados do INEP (>3GB)
sem travar a máquina local, validando schema e formatação das colunas
antes de escrever o pipeline de ETL "de verdade" (que vai rodar no S3/EC2).
"""

import duckdb

CAMINHO_ARQUIVO = "MICRODADOS_ENEM.csv"

# --- Por que DuckDB aqui, e não Polars puro? ------------------------------
# O leitor de CSV do Polars só suporta encoding "utf8"/"utf8-lossy" nativamente.
# Os Microdados do INEP vêm em "latin-1" (ISO-8859-1), então pl.read_csv()
# quebraria (ou corromperia acentos/caracteres especiais) com esse arquivo.
# O DuckDB suporta encoding="latin-1" de fábrica e, por ser um motor SQL
# colunar, ele faz "limit pushdown": com um LIMIT, ele para de ler o arquivo
# assim que junta as linhas pedidas, sem escanear os 3GB inteiros.
# ---------------------------------------------------------------------------

# duckdb.connect() sem argumentos cria um banco em memória (nada é persistido
# em disco). con.read_csv() não le o arquivo ainda - ele retorna uma
# DuckDBPyRelation, que é uma consulta "preguiçosa" (lazy), no mesmo espirito
# do LazyFrame do Polars: só executa de fato quando você "coleta" o resultado.
con = duckdb.connect()

relacao = con.read_csv(
    CAMINHO_ARQUIVO,
    delimiter=";",       # separador usado nos Microdados do ENEM
    encoding="latin-1",  # evita erro/corrupção de acentuação (ç, ã, é, etc.)
    header=True,         # a primeira linha do CSV contém os nomes das colunas
)

# .limit(100) é um método da API relacional do DuckDB - equivalente a um
# "LIMIT 100" em SQL. Como isso é aplicado ANTES de coletar os dados, o
# DuckDB só le o necessário do disco para satisfazer essas 100 linhas.
amostra_relacao = relacao.limit(100)

# .pl() executa a consulta e materializa o resultado como um DataFrame do
# Polars (equivalente ao .df() para pandas ou .arrow() para Arrow Table).
# É a partir daqui que o restante do pipeline (transformacoes pesadas,
# agregacoes, etc.) seguiria usando a API do Polars normalmente.
df = amostra_relacao.pl()

# df.schema retorna um dicionário ordenado {nome_da_coluna: tipo_polars},
# ex: {'NU_INSCRICAO': Int64, 'SG_UF_PROVA': String, ...}
print("=" * 80)
print("SCHEMA (colunas e tipos de dados)")
print("=" * 80)
print(df.schema)

# df.head(5) retorna um novo DataFrame só com as 5 primeiras linhas.
# O Polars já imprime isso formatado como tabela ao dar print().
print("\n" + "=" * 80)
print("PRIMEIRAS 5 LINHAS")
print("=" * 80)
print(df.head(5))
