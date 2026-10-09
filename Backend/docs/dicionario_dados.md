# Dicionário de Dados — Trilha de Gênero nas Exatas

> Issue #33.

## Fontes

- `PARTICIPANTES_2025.csv` — perfil/inscrição do participante
- `RESULTADOS_2025.csv` — notas do participante

Confirmado lendo o schema real de uma amostra de 100 linhas de cada arquivo
(via Polars, `separator=";"`, `encoding="latin1"`) e cruzando com o
Dicionário de Dados oficial do INEP (`DICIONÁRIO/Dicionário_Microdados_Enem_2025`).

## Colunas relevantes — PARTICIPANTES_2025.csv

| Coluna | Tipo | Descrição oficial (INEP) |
|---|---|---|
| `NU_INSCRICAO` | inteiro | Número de inscrição |
| `TP_SEXO` | string | Sexo do participante — valores observados nos dados: `"F"`, `"M"` |
| `SG_UF_PROVA` | string | Sigla da UF onde a prova foi realizada (ex: `SC`, `SP`) |

## Colunas relevantes — RESULTADOS_2025.csv

| Coluna | Tipo | Descrição oficial (INEP) |
|---|---|---|
| `NU_SEQUENCIAL` | inteiro | Número sequencial que identifica cada linha da base de Resultados |
| `NU_NOTA_MT` | float | Nota da prova de Matemática |
| `NU_NOTA_CN` | float | Nota da prova de Ciências da Natureza |
| `SG_UF_PROVA` | string | Sigla da UF onde a prova foi realizada (também presente aqui) |

## ⚠️ BLOQUEIO CRÍTICO — sem chave de junção entre as bases

O próprio Dicionário de Dados oficial do INEP declara, em nota de rodapé
sobre `NU_SEQUENCIAL`:

> "Variável distinta da NU_INSCRICAO disponível na base de Participantes,
> de modo que não é possível utilizá-la para relacionar as duas bases."

**Consequência:** não existe, entre `PARTICIPANTES_2025.csv` e
`RESULTADOS_2025.csv`, uma coluna em comum que permita cruzar o perfil
socioeconômico/demográfico de um participante com sua nota. Isso afeta
todos os módulos individuais do time (não apenas a Trilha de Gênero), já
que todos dependem de cruzar perfil × desempenho.

**Não resolvido dentro do escopo do #33** — decisão de arquitetura
necessária junto ao time/líder antes de qualquer ingestão completa (#34)
ou camada de acesso a dados (#36) ser construída em cima da suposição de
que esse cruzamento é possível com os arquivos atuais.

## Pendências

- [x] Confirmar valores de `TP_SEXO`
- [x] Confirmar colunas de nota (`NU_NOTA_MT`, `NU_NOTA_CN`)
- [x] Confirmar `SG_UF_PROVA`
- [x] **Decisão do time:** como proceder diante da ausência de chave de
      junção entre PARTICIPANTES e RESULTADOS — ver "Resolução final de
      arquitetura" abaixo.

## Resolução final de arquitetura (addendum #22, 2026-09-23)

A decisão sobre a ausência de chave de junção (seção "BLOQUEIO CRÍTICO"
acima) foi levada ao time e resolvida da seguinte forma:

- **Referência histórica de 2019 descartada.** Chegou a ser avaliada como
  alternativa (issue #43), mas o arquivo é grande demais pra baixar na
  prática e os dados têm 7 anos — desatualizados demais pra servir de
  parâmetro confiável. #43 foi fechada com a decisão revertida.

- **Arquitetura simplificada adotada, usando só dados de 2025:**
  - **Camada 1 — Nota × UF (ao vivo):** percentil/Z-Score real, calculado
    em tempo real, usando `SG_UF_PROVA` (presente nos dois arquivos de
    2025). É o único cruzamento que a nota realmente permite, e é
    compartilhado por todos os módulos.

  - **Camada 2 — Composição demográfica (ao vivo, sem nota):** cada
    módulo mostra um recorte real de `PARTICIPANTES_2025.csv` ao lado do
    percentil (ex: "% de mulheres inscritas no seu estado"), sem
    fingir uma correlação com a nota que os dados não permitem calcular.
    
- **Confirmado com o Felipe (27/09/2026):** a entrega são **dois Parquets
  separados** (`resultados_2025.parquet` e `participantes_2025.parquet`),
  não um arquivo único — misturar as duas fontes num só arquivo seria
  enganoso, já que não existe chave de junção entre elas. As 5 notas
  (CN, CH, LC, MT, Redação) entram no Parquet de resultados, não só
  Matemática, porque a Camada 1 é compartilhada por todos os módulos
  futuros do squad, não apenas a Trilha de Gênero.

> Nota: `NU_NOTA_CH`, `NU_NOTA_LC` e `NU_NOTA_REDACAO` foram incluídas no
> Parquet de produção por decisão do time (ver Volumetria abaixo), com
> nomes inferidos pelo mesmo padrão `NU_NOTA_<ÁREA>` das colunas já
> confirmadas (`NU_NOTA_MT`, `NU_NOTA_CN`) — ainda não foram confirmadas
> individualmente, uma a uma, no Dicionário oficial. Vale confirmar antes
> de citá-las formalmente no relatório da AV3.

## Volumetria de Produção (#34)

Ingestão completa rodada sobre os CSVs de 2025 inteiros (sem limite de
linhas), com seleção de colunas na leitura e compressão zstd na escrita.

| Arquivo | Linhas | Colunas | Tamanho |
|---|---|---|---|
| `resultados_2025.parquet` | 4.810.772 | `SG_UF_PROVA`, `NU_NOTA_CN`, `NU_NOTA_CH`, `NU_NOTA_LC`, `NU_NOTA_MT`, `NU_NOTA_REDACAO` | 39,99 MB |
| `participantes_2025.parquet` | 4.810.772 | `TP_SEXO`, `SG_UF_PROVA` | 3,32 MB |

Gerado por `Backend/etl/ingestion.py` (compressão zstd). Os arquivos não
são commitados no repositório (cobertos pelo `.gitignore`) — a entrega ao
Felipe, para upload no Azure Blob Storage, é feita por fora do Git.