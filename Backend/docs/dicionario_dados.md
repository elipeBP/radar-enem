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

## AV4 — Faixa etária (`TP_FAIXA_ETARIA`) — confirmado no dicionário 2025

> Seção complementar da issue [#52 — Filtro 5: Faixa Etária](https://github.com/elipeBP/radar-enem/issues/52).
> Não altera as seções acima; apenas acrescenta o mapeamento usado pelo Filtro 5.

A issue #52 usa a faixa etária do participante na Camada 2 (composição
demográfica, sem nota). A variável confirmada no dicionário oficial de 2025 é
**`TP_FAIXA_ETARIA`**, da base de **PARTICIPANTES** (mesma base de `TP_SEXO`) —
20 categorias, códigos 1 a 20:

| Código | Descrição oficial 2025 |
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

Fonte: `Dicionario/Dicionário_Microdados_Enem_2025.xlsx`, aba `PARTICIPANTES_2025`
(`TP_FAIXA_ETARIA` = "Faixa etária").

**Checklist de confirmação:**

- [x] Variável e códigos conferidos no dicionário oficial 2025 (aba `PARTICIPANTES_2025`)
- [x] Categorias oficiais 2025 transcritas aqui (código → descrição)
- [x] Coluna adicionada a `COLUNAS_PARTICIPANTES` em `etl/ingestion.py`
- [x] `participantes_2025.parquet` regerado e validado: os 20 códigos observados
      nos 4.810.772 registros batem exatamente com 1–20 (sem nulos, sem código
      fora do intervalo oficial)

**Agrupamento em faixas (ex: até 19, 20–25, 26–35, 36+) e a lógica do filtro em
si** ficam fora do escopo deste ticket de ingestão — são a implementação
individual do #52.

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
| `participantes_2025.parquet` | 4.810.772 | `SG_UF_PROVA`, `TP_SEXO`, `TP_FAIXA_ETARIA` | 5,67 MB |

> Atualizado após a ingestão de 2026-11-05 (adição de `TP_FAIXA_ETARIA` para o
> #52). As colunas `TP_PRESENCA_MT`/`TP_DEPENDENCIA_ADM_ESC` (#51) já estavam
> na base de resultados desde a ingestão anterior; a linha acima só não
> refletia o tamanho/colunas atualizados até agora.

Gerado por `Backend/etl/ingestion.py` (compressão zstd). Os arquivos não
são commitados no repositório (cobertos pelo `.gitignore`) — a entrega ao
Felipe, para upload no Azure Blob Storage, é feita por fora do Git.