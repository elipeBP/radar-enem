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

## AV4 — Tipo de escola (`TP_DEPENDENCIA_ADM_ESC`) — confirmado no dicionário 2025

> Seção complementar da issue [#51 — Filtro 4: Tipo de Escola](https://github.com/elipeBP/radar-enem/issues/51).
> Não altera o conteúdo da Trilha de Gênero acima; apenas acrescenta o mapeamento usado pelo Filtro 4.

A issue #51 calcula a composição pública × privada por UF. Após conferência do
dicionário oficial de 2025, a variável usada é **`TP_DEPENDENCIA_ADM_ESC`**
(dependência administrativa da escola de conclusão), da base de **RESULTADOS** —
e **não** `TP_ESCOLA` (que **não existe** em 2025) nem `Q023` (trajetória escolar
autodeclarada, não binária e em arquivo separado da nota). A codificação em
`core/escola.py` (`CATEGORIAS_DEPENDENCIA`/`GRUPOS_VALIDOS`) segue o dicionário 2025:

| Código | Descrição oficial 2025 | Uso no Filtro 4 |
|---|---|---|
| 1 | Federal | Pública (categoria válida) |
| 2 | Estadual | Pública (categoria válida) |
| 3 | Municipal | Pública (categoria válida) |
| 4 | Privada | Privada (categoria válida) |
| vazio/nulo | Escola não identificada no Censo | sem informação (excluído, medido como cobertura) |
| outro | não previsto | excluído e listado pelo código |

Fonte: `Dicionario/Dicionário_Microdados_Enem_2025.xlsx`, aba `RESULTADOS_2025`
(`TP_DEPENDENCIA_ADM_ESC` = "Dependência administrativa (Escola)").

**Checklist de confirmação:**

- [x] Variável e códigos conferidos no dicionário oficial 2025 (aba `RESULTADOS_2025`)
- [x] Categorias oficiais 2025 transcritas aqui (código → descrição)
- [x] `MAPEAMENTO_CONFIRMADO = True` em `core/escola.py` (`CATEGORIAS_DEPENDENCIA`)
- [ ] `python etl/validar_tp_escola.py --linhas 0` sobre `RESULTADOS_2025.csv` real, sem códigos não previstos
- [ ] `resultados_2025.parquet` regerado e validado com `python etl/validar_tp_escola.py --parquet`

Os dois últimos itens dependem dos microdados CSV reais, que não acompanham o repositório.

**Restrição de arquitetura mantida:** a composição por `TP_DEPENDENCIA_ADM_ESC` é
calculada sobre o arquivo de resultados, por UF, **sem junção** individual com
participantes — o próprio dicionário do INEP 2025 indica que `NU_SEQUENCIAL` e
`NU_INSCRICAO` não permitem relacionar as duas bases. As notas (`NU_NOTA_MT`) e a
dependência ficam na mesma linha de resultados, mas são tratadas como estatísticas
separadas (ver `Backend/docs/filtro_tipo_escola_av4.md`).

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
| `resultados_2025.parquet` | 4.810.772 | `SG_UF_PROVA`, `NU_NOTA_CN`, `NU_NOTA_CH`, `NU_NOTA_LC`, `NU_NOTA_MT`, `NU_NOTA_REDACAO`, `TP_PRESENCA_MT`, `TP_DEPENDENCIA_ADM_ESC` | 41,49 MB |
| `participantes_2025.parquet` | 4.810.772 | `TP_FAIXA_ETARIA`, `TP_SEXO`, `SG_UF_PROVA` | 5,67 MB |

Gerado por `Backend/etl/ingestion.py` (compressão zstd). Os arquivos não
são commitados no repositório (cobertos pelo `.gitignore`) — a entrega é
feita como asset de uma GitHub Release, baixada pelo `Dockerfile` no
build (ver #17).

## Ano 2024 (#17 — Trilha de Gênero com seletor de ano)

A Trilha de Gênero é o único módulo com seletor de ano exposto no
frontend (`core/genero.py`, `ANOS_DISPONIVEIS`). Antes do #17, qualquer
ano diferente de 2025 dava erro — o dropdown oferecia 10 anos (2016 a
2025) mas só 2025 tinha dado de verdade. Resolvido ingerindo também o
ZIP oficial de 2024 do INEP
(`https://download.inep.gov.br/microdados/microdados_enem_2024.zip`).

**Schema conferido igual ao de 2025** (mesmas colunas, mesmos nomes, lido
da amostra real do CSV de 2024 antes de rodar a ingestão completa — não
presumido): `RESULTADOS_2024.csv` e `PARTICIPANTES_2024.csv` têm as
mesmas colunas usadas pela Trilha de Gênero e seguem a mesma convenção
`;`/`latin1`/sem chave de junção entre as duas bases (mesmo "BLOQUEIO
CRÍTICO" documentado acima, válido pra qualquer ano).

| Arquivo | Linhas | Colunas | Tamanho |
|---|---|---|---|
| `resultados_2024.parquet` | 4.332.944 | `TP_DEPENDENCIA_ADM_ESC`, `SG_UF_PROVA`, `TP_PRESENCA_MT`, `NU_NOTA_CN`, `NU_NOTA_CH`, `NU_NOTA_LC`, `NU_NOTA_MT`, `NU_NOTA_REDACAO` | 37,95 MB |
| `participantes_2024.parquet` | 4.332.944 | `TP_FAIXA_ETARIA`, `TP_SEXO`, `SG_UF_PROVA` | 5,12 MB |

Validação rápida pós-ingestão: `TP_SEXO` só tem `F`/`M` (2.624.621 /
1.708.323 — 60,6% mulheres, consistente com o padrão histórico do ENEM);
`SG_UF_PROVA` tem as 27 UFs; `NU_NOTA_MT` fica dentro de [0, 1000]
(min 0,0, max 961,9, média 526,97); SC bate entre os dois arquivos
(95.126 registros nos dois).

**Decisão de arquitetura (RAM, não só dado):** o Parquet inteiro (4,8
milhões de linhas) nunca é carregado por completo em memória. A leitura
é preguiçosa (`pl.scan_parquet`) com projeção de colunas e filtro por UF
empurrados pro leitor — cada requisição só materializa as linhas da(s)
UF(s) pedida(s) e só as colunas que o módulo realmente usa. Isso existe
porque a primeira versão (carregar o ano inteiro em `app.state` no
startup) deu OOM real em produção no Render (512MB de RAM do free tier)
— ver histórico do #17. Ver `core/dados.py:carregar_dados_genero`.

## Filtro 5 — Faixa Etária (`TP_FAIXA_ETARIA`) — issue #52

**Coluna confirmada no dicionário oficial** (mesmo processo já feito pra
`TP_SEXO` em #33/#42): `Dicionário_Microdados_Enem_2024.xlsx`, aba
`PARTICIPANTES_2024`, variável `TP_FAIXA_ETARIA` ("Faixa etária"),
numérica, 20 categorias. A coluna 2025 não foi conferida contra o
dicionário de 2025 (não disponível localmente), mas o nome e os valores
observados em `PARTICIPANTES_2025.csv` são idênticos aos de 2024 — a
metodologia do INEP pra essa variável é estável entre edições (ao
contrário de códigos específicos de prova/escola).

| Código | Faixa etária oficial |
|---|---|
| 1 | Menor de 17 anos |
| 2 | 17 anos |
| 3 | 18 anos |
| 4 | 19 anos |
| 5 | 20 anos |
| 6 | 21 anos |
| 7 | 22 anos |
| 8 | 23 anos |
| 9 | 24 anos |
| 10 | 25 anos |
| 11 | Entre 26 e 30 anos |
| 12 | Entre 31 e 35 anos |
| 13 | Entre 36 e 40 anos |
| 14 | Entre 41 e 45 anos |
| 15 | Entre 46 e 50 anos |
| 16 | Entre 51 e 55 anos |
| 17 | Entre 56 e 60 anos |
| 18 | Entre 61 e 65 anos |
| 19 | Entre 66 e 70 anos |
| 20 | Maior de 70 anos |

Fonte: `core/faixa_etaria.py` (`FAIXAS_ETARIAS`).

**Validação pós-ingestão** (`participantes_2025.parquet`, 4.810.772
linhas): todos os 20 códigos (1–20) presentes, **zero nulos** — ao
contrário de `TP_DEPENDENCIA_ADM_ESC` (Filtro 4), que tem lacunas reais
porque depende do Censo Escolar, `TP_FAIXA_ETARIA` é autodeclarado na
inscrição e vem sempre preenchido. Por isso o Filtro 5 não precisa de um
bucket "sem informação" como o Filtro 4 tem.

**Arquitetura igual à Trilha de Gênero** (duas fontes independentes, sem
junção): Camada 1 (percentil nota×UF) vem de `resultados_<ano>.parquet`;
Camada 2 (composição por faixa etária) vem de `participantes_<ano>.parquet`
— mesmo "BLOQUEIO CRÍTICO" de ausência de chave de junção entre as duas
bases, documentado acima, se aplica aqui. Diferente da Trilha de Gênero,
não tem seletor de ano (sempre o ano padrão, 2025) — segue o mesmo
padrão de `core/escola.py`/`core/nota_uf.py`.