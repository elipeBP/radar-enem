# Filtro 4 — Tipo de Escola (AV4)

**Issue:** https://github.com/elipeBP/radar-enem/issues/51
**Responsável:** Maykon Douglas (MDCarvalho-77)
**Status:** implementação concluída, mapeamento **confirmado** no dicionário oficial de 2025 (seção 8) e **validado com os microdados reais** do ENEM 2025 (seção 9). O ETL foi executado sobre `RESULTADOS_2025.csv` (4.810.772 registros), os Parquets foram gerados e validados, a suíte de backend passou (64 testes, dados sintéticos) e o endpoint foi exercido via `TestClient` sobre o Parquet real (HTTP 200/422/503; cobertura 45,8% em SC e 44,7% em SP). Pendências reais restantes: `npm run lint`/`npm run build` (sem Node nesta máquina) e a rastreabilidade GitHub (branch/commits/PR).

> **Correção de modelagem (etapa AV4):** a versão inicial usava uma coluna `TP_ESCOLA` na base de participantes. A auditoria do dicionário oficial de 2025 mostrou que **`TP_ESCOLA` não existe** nos microdados de 2025. A variável correta para "pública × privada" é **`TP_DEPENDENCIA_ADM_ESC`**, na base de **resultados** (ver seção 1.3 e seção 7). Toda a Camada B foi migrada para essa variável.

## 1. Regra de negócio

O usuário escolhe uma UF e informa sua nota de Matemática. A API devolve **duas análises independentes**, ambas a partir do arquivo de **resultados**, filtradas por `SG_UF_PROVA`, **sem junção** com a base de participantes:

| | Análise A — Desempenho | Análise B — Composição |
|---|---|---|
| Arquivo | `resultados_2025.parquet` (de `RESULTADOS_2025.csv`) | `resultados_2025.parquet` (de `RESULTADOS_2025.csv`) |
| Recorte | `SG_UF_PROVA` = UF; presentes (`TP_PRESENCA_MT` = 1) | `SG_UF_PROVA` = UF |
| Variável | `NU_NOTA_MT` | `TP_DEPENDENCIA_ADM_ESC` |
| Resultado | percentil da nota informada | quantidade, % e cobertura por rede (pública × privada) |

### 1.1 Por que Matemática

A issue #51 pede o "percentil nota×UF (Camada 1)" compartilhado entre os filtros. O contrato já usado no projeto (`FiltroGenero` e a arquitetura do README) recebe `nota_matematica`, e `NU_NOTA_MT` é uma das colunas de nota confirmadas no dicionário oficial de 2025 (aba `RESULTADOS_2025`). Por isso o Filtro 4 usa a mesma variável, sem inventar um contrato novo.

### 1.2 Percentil (Análise A)

**População de referência:** registros de `resultados_2025.parquet` com `SG_UF_PROVA` = UF, **presentes na prova de Matemática** (`TP_PRESENCA_MT` = 1) e com `NU_NOTA_MT` válida.

**Critério de inclusão:** presente em Matemática e nota não nula, numérica, finita e dentro de [0, 1000]. Os registros fora disso (ausentes/eliminados, nota em branco, valores corrompidos) **não entram** na população e são contados em `registros_sem_nota_valida_uf`.

**Fórmula** (função compartilhada `calcular_percentil`, em `core/estatistica.py`):

$$PR(x) = \frac{B + 0{,}5\,E}{N} \times 100$$

em que $B$ é o número de notas válidas menores que $x$, $E$ o número de notas iguais a $x$ e $N$ o total de notas válidas da UF (entre os presentes).

**Interpretação:** "cerca de PR% das notas válidas de Matemática de quem esteve presente na prova na UF são inferiores à sua; notas iguais contam pela metade". Vale 0 quando a nota é menor que todas e 100 quando é maior que todas.

**Limitações:**
- `SG_UF_PROVA` é a UF onde a prova foi feita, não a UF de residência nem a da escola.
- Filtrar por `TP_PRESENCA_MT = 1` remove da base os zeros de ausentes/eliminados — melhoria frente à versão anterior, que não tinha a variável de presença.

### 1.3 Composição por dependência administrativa (Análise B)

A variável é **`TP_DEPENDENCIA_ADM_ESC`** (dependência administrativa da escola de conclusão), da base de **resultados**. Mapeamento (fonte única: `CATEGORIAS_DEPENDENCIA`/`GRUPOS_VALIDOS`, em `core/escola.py`), **confirmado** no dicionário oficial de 2025:

| Código | Significado oficial | Grupo no Filtro 4 | Entra no denominador válido? |
|---|---|---|---|
| `1` | Federal | Pública | Sim |
| `2` | Estadual | Pública | Sim |
| `3` | Municipal | Pública | Sim |
| `4` | Privada | Privada | Sim |
| vazio/nulo | Escola não identificada no Censo | Sem informação | Não, informado em `excluidos` |
| qualquer outro | Código não previsto | — | Não, listado pelo código em `excluidos` |

> **Situação do mapeamento:** `MAPEAMENTO_CONFIRMADO = True`. Fonte: `Dicionario/Dicionário_Microdados_Enem_2025.xlsx`, aba `RESULTADOS_2025` (ver seção 7). A confirmação do mapeamento **não** significa que o ETL foi validado com os CSVs reais — isso ainda depende dos microdados.

**Denominadores explícitos:**
- `total_registros_uf`: todas as linhas de resultados da UF;
- `total_validos`: pública (1+2+3) + privada (4);
- `percentual_validos = quantidade / total_validos × 100`. Pública + privada somam 100%, com diferença de até 0,01 ponto por arredondamento (2 casas);
- `percentual_total = quantidade / total_registros_uf × 100`, mostrado para deixar claro o peso das exclusões;
- `total_excluidos = total_registros_uf − total_validos`, detalhado em `excluidos`;
- `cobertura = total_validos / total_registros_uf × 100`: proporção de registros da UF com dependência administrativa classificada.

**Cuidado na leitura:** `TP_DEPENDENCIA_ADM_ESC` vem de `CO_ESCOLA`, obtida do **Censo Escolar** via CPF, só para prováveis concluintes com escola identificada. Logo a composição descreve **os registros com escola de conclusão identificada no Censo** (medidos pela `cobertura`), e **não** todos os inscritos ou presentes da UF.

### 1.4 Independência das análises (sem junção)

O dicionário oficial do INEP 2025 (aba `RESULTADOS_2025`, nota de `NU_SEQUENCIAL`) reafirma que ela "é distinta da `NU_INSCRICAO`… não é possível utilizá-la para relacionar as duas bases". Por isso:
- as duas análises saem do **mesmo arquivo de resultados**, mas permanecem **estatísticas separadas**: a dependência da escola **não** é atribuída à nota informada;
- **não** é feita junção por chave nem por posição. Há um teste que embaralha as linhas e verifica que o resultado não muda (`test_analises_sao_independentes_sem_juncao`);
- a interface separa "Análise A" e "Análise B" e avisa que elas **não** comparam o desempenho de escolas públicas e privadas;
- nenhuma conclusão causal ou de superioridade de rede é apresentada.

> **Por que não `Q023`:** `Q023` (base de participantes) mede a **trajetória escolar autodeclarada** no EM, com 6 alternativas (incluindo trechos mistos e bolsa) e a opção "não frequentei". Não é a dependência administrativa da escola e não é binária, além de ficar em arquivo separado da nota. Por isso `TP_DEPENDENCIA_ADM_ESC` foi preferida (ver seção 7).

> **Comparação de desempenho entre redes — NÃO implementada:** embora nota e dependência estejam agora na mesma linha (o que a tornaria tecnicamente possível sem junção), isso mudaria o escopo da #51 e exige decisão da equipe. O Filtro 4 mantém as duas análises **separadas**.

## 2. Inputs e validação

`POST /api/dados/escola`, seguindo o padrão `POST /api/dados/<módulo>` com schemas `FiltroX`/`RespostaX`.

| Campo | Tipo | Regra (Pydantic `FiltroEscola`) |
|---|---|---|
| `estado` | string | Obrigatório. Remove espaços e converte para maiúsculas. Precisa ser uma das 27 UFs. Vazio ou outro tipo → 422 |
| `nota_matematica` | número | Obrigatório. Só aceita int ou float (texto, string vazia, booleano e `null` são rejeitados). Precisa ser finito e estar em [0, 1000] |
| (outros) | — | Campos extras são proibidos (`extra="forbid"`) → 422 |

| Situação | HTTP | Exemplo de `detail` |
|---|---|---|
| Sucesso | 200 | `status`, `mensagem` (com cobertura observada; aviso de provisório só se o mapeamento não estiver confirmado) e `dados` |
| Payload inválido ou corpo que não é JSON | 422 | lista de erros do Pydantic |
| UF sem notas válidas (presentes) ou sem nenhuma dependência pública/privada | 404 | "Não existem notas válidas de Matemática entre os presentes de RJ…" |
| Parquet ausente, corrompido ou sem `TP_DEPENDENCIA_ADM_ESC`/`TP_PRESENCA_MT`/`NU_NOTA_MT` | 503 | "O arquivo resultados_2025.parquet não contém as colunas obrigatórias: TP_DEPENDENCIA_ADM_ESC…" |

Nenhum caso devolve 200 com zeros ou listas vazias para disfarçar a falta de dados.

O serviço (`analisar_tipo_escola`) também confere a nota por conta própria (defesa em profundidade), para o caso de ser chamado sem passar pela API.

## 3. ETL

- `etl/ingestion.py`: a projeção de **resultados** (`COLUNAS_RESULTADOS`) passou a incluir `TP_PRESENCA_MT` e `TP_DEPENDENCIA_ADM_ESC`. `TP_DEPENDENCIA_ADM_ESC` é lida como **texto** (`TIPOS_RESULTADOS = {"TP_DEPENDENCIA_ADM_ESC": pl.String}`), preservando o código bruto do INEP sem coerção. A leitura continua com projeção de colunas (`columns=`) e compressão zstd, como antes. A projeção de **participantes** deixou de incluir `TP_ESCOLA` (que não existe em 2025); permanece com `SG_UF_PROVA` e `TP_SEXO`, intactas para os demais módulos.
- Não são removidas linhas nem duplicatas: por decisão de LGPD não há identificador utilizável; a contagem é conferida pela volumetria impressa no fim do ETL.
- `etl/validar_tp_escola.py` (mantido com este nome para não renomear arquivo da entrega): agora valida **`TP_DEPENDENCIA_ADM_ESC`** no **CSV e no Parquet de resultados**, mantendo a leitura em streaming/lazy:
  - `python etl/validar_tp_escola.py`: lê uma amostra do `RESULTADOS_2025.csv` em streaming;
  - `--linhas 0`: lê o arquivo inteiro, sem carregá-lo na memória;
  - `--parquet`: valida o `resultados_2025.parquet` gerado (schema, UFs distintas, distribuição dos códigos);
  - sai com código 1 quando encontra códigos que não estão em `CATEGORIAS_DEPENDENCIA`.
- A API lê o Parquet com `pl.scan_parquet` (lazy): projeta só as colunas necessárias e filtra pela UF, sem manter os ~4,8 milhões de linhas em memória entre requisições. A pasta pode ser trocada pela variável de ambiente `RADAR_ENEM_PASTA_PARQUET`.

> **Nota:** o `resultados_2025.parquet` já foi **regerado com o ETL atualizado** a partir do `RESULTADOS_2025.csv` real (4.810.772 linhas; 8 colunas, incluindo `TP_PRESENCA_MT` e `TP_DEPENDENCIA_ADM_ESC`; 41,59 MB, zstd — ver seção 9). Se a rota for executada contra um Parquet antigo (sem essas colunas) ou ausente, ela responde **503** com mensagem clara.

## 4. Testes automatizados (dados sintéticos)

> **Distinção importante:** esta seção descreve a **suíte automatizada**, que usa **dados sintéticos** em Parquets temporários (`tmp_path`), independentes dos microdados reais. A validação com o **Parquet real** (via `TestClient` e conferência agregada) está na **seção 9** — são execuções distintas e não devem ser confundidas.

`tests/test_filtro_escola.py` e `tests/test_estatistica.py`. **Execução real registrada em 13/10/2026 (Python 3.13, Polars 2.0.0, FastAPI 0.143.0, Pydantic 2.14.1): `pytest -q` → 64 passed, 2 warnings** (os 2 warnings são preexistentes e alheios ao Filtro 4: deprecação do `TestClient`/httpx e do `class Config` em `FiltroGenero`). Cobertura:

- composição (dependência): pública = 1+2+3 agregados; privada = 4; nulo/vazio → sem informação; códigos desconhecidos (ex.: `9`, texto) fora do denominador; `percentual_validos`/`percentual_total`/`cobertura` com valores conhecidos; soma de 100% dentro da tolerância; cobertura baixa não vira zeros; normalização da UF; códigos inteiros; UF sem registros; coluna ausente; `MAPEAMENTO_CONFIRMADO = True`;
- percentil: apenas presentes (`TP_PRESENCA_MT = 1`) com nota válida; ausente com 0,0 não entra; empates; limites 0 e 100; exclusão de notas nulas, negativas, acima de 1000, não numéricas e NaN; UF sem notas válidas;
- independência: embaralhar as linhas não altera o resultado;
- schema: 14 payloads inválidos;
- API ponta a ponta com Parquet temporário: 200 (expondo `cobertura` e `codigos` dos grupos), 404, 422 (inclusive corpo não JSON) e 503 (arquivo ausente, sem `TP_DEPENDENCIA_ADM_ESC`, corrompido);
- ETL: `TP_DEPENDENCIA_ADM_ESC` projetada e preservada como texto em um CSV de resultados latin-1 sintético, descartando colunas fora da projeção.

```powershell
cd Backend
.venv\Scripts\Activate.ps1
pytest -q
```

Saída real registrada (13/10/2026): **64 passed, 2 warnings**.

## 5. Interface

Componente `frontend/src/components/FiltroEscola.jsx`, acessado pela aba "Tipo de escola" da navegação de módulos em `App.jsx`:

- seleção obrigatória da UF e campo de nota que aceita vírgula ou ponto, validados antes do envio, com mensagens por campo (`aria-invalid`, `aria-describedby`);
- estados de carregamento, vazio e erro (`role="alert"`, `aria-live`). As mensagens de erro diferenciam 404, 422 e 503;
- Análise A: percentil, barra 0–100, interpretação, base de comparação (presentes), registros excluídos e método;
- Análise B: barra empilhada pública/privada (com `aria-label`), tabela com quantidades, % dos válidos e % do total, linha de total, registros sem informação/códigos não previstos, **cobertura** e nota explicando que a composição cobre só escolas identificadas no Censo;
- nenhum valor fixo de resultado: tudo vem do endpoint.

> **Validação da interface:** `npm run lint` e `npm run build` **não puderam ser executados nesta máquina** porque não há runtime Node/npm disponível no ambiente (o oxlint instalado depende do launcher Node). As mudanças no `.jsx` são localizadas e seguem o padrão já existente do componente; a validação de lint/build deve ser feita na máquina do Felipe (Node 22), antes do PR.

## 6. Evidências para a AV4

**Já concluídas (ver seção 9):**
- `pytest -q` → 64 passed (dados sintéticos).
- `python etl/validar_tp_escola.py --linhas 0` sobre o `RESULTADOS_2025.csv` real → 4.810.772 registros, códigos {1,2,3,4} + vazios, **nenhum código desconhecido**.
- ETL executado e `validar_tp_escola.py --parquet` com totais idênticos aos do CSV.
- Endpoint testado via `TestClient` sobre o Parquet real: HTTP 200 (SC, SP), 422 (UF/nota inválida), 503 (dados indisponíveis); cobertura real medida por UF.

**Pendentes:**
1. `npm run lint` e `npm run build` em máquina com Node (indisponível nesta máquina).
2. Rastreabilidade GitHub: branch `feature/51-filtro-tipo-escola` em um clone do repositório oficial, commits próprios (serviço/ETL → API/schema → frontend → testes/docs) e PR vinculado com `Closes #51`, descrevendo regras, decisões e limitações.

## 7. Investigação de `TP_ESCOLA` (Etapa 2 — 13/10/2026)

Esta seção registra **apenas fatos verificados** na conferência de dicionário oficial. Ela **não** altera o código, **não** regera Parquets e **não** marca `MAPEAMENTO_CONFIRMADO = True`. O objetivo foi comprovar documentalmente a definição de `TP_ESCOLA` antes de qualquer ajuste estatístico.

### 7.1 Disponibilidade dos microdados nesta máquina (verificado)

- **Não há** microdados do ENEM **2025** nesta máquina (nem ZIP, nem dicionário 2025, nem CSVs). Busca no workspace e nas pastas do usuário não encontrou nenhum artefato de 2025.
- **Há** o ZIP da edição **2024**: `C:\Users\mayko\Downloads\microdados_enem_2024.zip` (~501,7 MB). Dentro dele, o dicionário oficial é `microdados_enem_2024/DICIONÁRIO/Dicionário_Microdados_Enem_2024.xlsx` (~35 KB). Esse dicionário foi inspecionado **sem extrair os CSVs** de GB (leitura só do `.xlsx`).

> ⚠️ Por exigência da AV4, **a edição 2024 não serve como prova da codificação de 2025**. Os achados abaixo são **referência de contexto de 2024**, não confirmação de 2025.

### 7.2 Achado crítico: não existe coluna `TP_ESCOLA` em 2024 (verificado)

Fonte: `Dicionário_Microdados_Enem_2024.xlsx` (aba "PARTICIPANTES") e o cabeçalho real de `DADOS/PARTICIPANTES_2024.csv` (lido em streaming do ZIP, encoding latin-1).

- O cabeçalho real de `PARTICIPANTES_2024.csv` tem 38 colunas e **não contém `TP_ESCOLA`**. As colunas relacionadas a escola/ensino são: `TP_ST_CONCLUSAO`, `TP_ANO_CONCLUIU`, `TP_ENSINO` e o item socioeconômico `Q023`.
- A pergunta "Em que tipo de escola você frequentou ou frequenta o Ensino Médio?" é o item **`Q023`**, com **6 categorias alfanuméricas** (A–F), **não** um código 1/2/3:

  | Código `Q023` | Descrição oficial (2024) |
  |---|---|
  | A | Somente em escola pública |
  | B | Parte em escola pública e parte em escola privada **sem** bolsa integral |
  | C | Parte em escola pública e parte em escola privada **com** bolsa integral |
  | D | Somente em escola privada **sem** bolsa integral |
  | E | Somente em escola privada **com** bolsa integral |
  | F | Não frequentei escola de Ensino Médio |

- A variável que separa rede pública/privada por **dependência administrativa** é `TP_DEPENDENCIA_ADM_ESC`, presente apenas no arquivo de **RESULTADOS** (não em participantes), proveniente do Censo Escolar, com os códigos: 1=Federal, 2=Estadual, 3=Municipal, 4=Privada. Ela só existe para quem teve a escola identificada no Censo (concluintes), e pode vir mascarada.

### 7.3 Consequências para a implementação atual (hipótese a validar com dados de 2025)

O código assume uma coluna `TP_ESCOLA` com `1=Não respondeu, 2=Pública, 3=Privada`. **Nenhuma dessas premissas foi confirmada para 2025**, e **nenhuma delas bate com o dicionário 2024**:

- não há coluna `TP_ESCOLA` em 2024 (seria `Q023` ou `TP_DEPENDENCIA_ADM_ESC`, com codificações bem diferentes);
- se 2025 seguir o padrão 2024, "pública × privada" não é um par binário simples: há casos mistos e de bolsa (`Q023` B/C/D/E) e a dependência administrativa tem 4 redes (`TP_DEPENDENCIA_ADM_ESC`).

Isto é **hipótese** até o dicionário oficial de 2025 ser conferido. O comportamento defensivo do código (`MAPEAMENTO_CONFIRMADO = False`, códigos não previstos excluídos do denominador) continua adequado justamente por essa incerteza.

### 7.4 Como obter apenas o dicionário de 2025 (sem baixar gigabytes)

- Fonte oficial: **https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enem**
- O download do INEP é um ZIP único de vários GB. Para extrair **somente** o dicionário sem descompactar os CSVs, abrir o ZIP como arquivo compactado e extrair apenas `microdados_enem_2025/DICIONÁRIO/Dicionário_Microdados_Enem_2025.xlsx` (o dicionário costuma ter dezenas de KB). O mesmo vale para conferir só o cabeçalho de `PARTICIPANTES_2025.csv` lendo a primeira linha em streaming, sem materializar o arquivo.

### 7.5 Decisão recomendada

1. **Não** marcar `MAPEAMENTO_CONFIRMADO = True` — não há evidência oficial de 2025.
2. Ao obter o dicionário 2025, confirmar primeiro **qual é o nome real da coluna** de tipo de escola em `PARTICIPANTES_2025.csv` (pode não ser `TP_ESCOLA`) e **qual codificação** ela usa. Isso pode exigir ajustar `COLUNAS_PARTICIPANTES`, o ETL e `CATEGORIAS_TP_ESCOLA`, não só confirmar um booleano.
3. Decidir, com o time, se "pública × privada" deve se basear em `Q023` (autodeclarado, com cenários de bolsa) ou em `TP_DEPENDENCIA_ADM_ESC` (dependência administrativa do Censo, só no arquivo de resultados) — são fontes com semânticas e denominadores diferentes.

### 7.6 Dúvidas remanescentes (pendências)

> Estas eram as dúvidas **na Etapa 2** (só com o ZIP de 2024). Todas foram **resolvidas depois**: o dicionário 2025 e os microdados reais confirmaram a variável e produziram os percentuais reais — ver seções 8 e 9. O texto abaixo é mantido como registro histórico.

- Nome e codificação oficiais da variável de tipo de escola em **2025** — ~~não verificável sem o dicionário 2025~~ → confirmado na seção 8 (`TP_DEPENDENCIA_ADM_ESC`).
- Se `PARTICIPANTES_2025.csv` traz uma coluna `TP_ESCOLA` — ~~não confirmado~~ → confirmado que **não existe** (seção 8.1).
- Percentuais reais de composição por UF — ~~não produzidos~~ → produzidos na seção 9 (SC/SP, com dados reais).

## 8. Confirmação oficial 2025 e implementação (Etapa 3 — 13/10/2026)

> A seção 7 acima é o registro histórico da investigação feita quando só havia o ZIP de **2024**. Esta seção 8 atualiza aquela conclusão com o **dicionário oficial de 2025**, agora presente na cópia, e registra a decisão efetivamente implementada. Onde a seção 7 diz "não confirmar", vale esta seção 8.

### 8.1 Fonte verificada

Arquivo local: `Dicionario/Dicionário_Microdados_Enem_2025.xlsx` (abas `PARTICIPANTES_2025` e `RESULTADOS_2025`), inspecionado célula a célula. Confirmado:

- **`TP_ESCOLA` não existe** em 2025 (nenhuma aba). Em PARTICIPANTES, tipo de escola é só o item socioeconômico `Q023` (A–F).
- **`TP_DEPENDENCIA_ADM_ESC`** (aba `RESULTADOS_2025`): "Dependência administrativa (Escola)" — **1=Federal, 2=Estadual, 3=Municipal, 4=Privada**.
- `RESULTADOS_2025` também traz `SG_UF_PROVA`, `NU_NOTA_MT` e `TP_PRESENCA_MT` (0=Faltou, 1=Presente, 2=Eliminado).
- `NU_SEQUENCIAL` (nota oficial) reafirma: distinta de `NU_INSCRICAO`, **sem chave de junção** entre as bases.

### 8.2 Decisão implementada

- **Variável:** `TP_DEPENDENCIA_ADM_ESC` (resultados). **Pública = {1,2,3}; Privada = {4}.**
- **Por que não `Q023`:** mede trajetória autodeclarada (não a dependência da escola), não é binária e fica em arquivo separado da nota. Ver seção 1.4.
- **Percentil:** só presentes (`TP_PRESENCA_MT = 1`) com nota válida.
- **Cobertura:** reportada porque a dependência só existe para escolas identificadas no Censo.
- `MAPEAMENTO_CONFIRMADO = True` (o código usa de fato a variável e os códigos documentados em 2025). Isso **não** significa que o ETL foi validado com os CSVs reais.

### 8.3 Arquivos alterados nesta etapa

- `core/escola.py`: Camada B migrada para `TP_DEPENDENCIA_ADM_ESC` na base de resultados; `CATEGORIAS_DEPENDENCIA`/`GRUPOS_VALIDOS`; `cobertura`; percentil com `TP_PRESENCA_MT`; `analisar_tipo_escola` lê só resultados.
- `etl/ingestion.py`: `+TP_PRESENCA_MT`, `+TP_DEPENDENCIA_ADM_ESC` em resultados (texto); `-TP_ESCOLA` de participantes.
- `etl/validar_tp_escola.py`: valida `TP_DEPENDENCIA_ADM_ESC` no CSV/Parquet de resultados.
- `api/schemas.py`: `CategoriaEscola.codigos` (lista), `ComposicaoEscola.cobertura`.
- `api/main.py`: mensagem com cobertura.
- `frontend/src/components/FiltroEscola.jsx`: cobertura, rótulos de dependência, nota do Censo.
- `tests/test_filtro_escola.py`: suíte reescrita para o novo modelo (ver seção 4).

### 8.4 Situação das pendências (atualizada na Etapa 4/5)

- ~~Regerar `resultados_2025.parquet`~~ → **CONCLUÍDO** (seção 9).
- ~~Medir a cobertura real por UF~~ → **CONCLUÍDO** (SC 45,8%, SP 44,7%; seção 9).
- ~~Rodar `validar_tp_escola.py --linhas 0` sobre o CSV real~~ → **CONCLUÍDO** (nenhum código fora de {1,2,3,4}; seção 9).
- `npm run lint` / `npm run build` em máquina com Node — **ainda pendente** (sem Node nesta máquina).

### 8.5 Limitações conhecidas

- Sem chave de junção participante↔resultado: as duas análises são separadas, nunca cruzadas.
- A composição descreve concluintes com escola identificada no Censo (ver cobertura), não todos os inscritos/presentes. Com dados reais, a cobertura ficou em torno de **44–46%** nas UFs testadas — ou seja, a maioria dos registros fica como "sem informação".
- `CO_ESCOLA` é mascarado para escolas com <10 participantes (não afeta o código da dependência, mas sinaliza dado sensível).
- Os números reais da seção 9 valem para a execução de 13/10/2026; dependem do Parquet gerado localmente e não foram publicados.

## 9. Validação com os microdados reais (Etapa 3–4 — 13/10/2026)

Esta seção registra a execução **com os microdados oficiais do ENEM 2025**, distinta da suíte sintética da seção 4. Os CSVs reais foram disponibilizados em `Dados/` e copiados (sem mover os originais) para o caminho esperado pelo ETL. Apenas estatísticas **agregadas** são reportadas; nenhuma linha de microdado foi copiada.

### 9.1 ETL e Parquets gerados

`python etl/ingestion.py` (modo produção, arquivo completo):

| Parquet | Linhas | Colunas | Tamanho |
|---|---|---|---|
| `etl/producao/resultados_2025.parquet` | 4.810.772 | 8 (`SG_UF_PROVA, NU_NOTA_CN, NU_NOTA_CH, NU_NOTA_LC, NU_NOTA_MT, NU_NOTA_REDACAO, TP_PRESENCA_MT, TP_DEPENDENCIA_ADM_ESC`) | 41,59 MB (zstd) |
| `etl/producao/participantes_2025.parquet` | 4.810.772 | 2 (`SG_UF_PROVA, TP_SEXO`) | 3,33 MB (zstd) |

O Parquet de participantes manteve só `SG_UF_PROVA`/`TP_SEXO`, preservando a compatibilidade com os módulos da equipe (sem `TP_ESCOLA`).

### 9.2 Validação da variável (CSV e Parquet)

`validar_tp_escola.py --linhas 0` (CSV inteiro) e `--parquet` deram **totais idênticos** — esperado, pois o ETL projeta colunas mas não filtra nem remove linhas. Distribuição real de `TP_DEPENDENCIA_ADM_ESC` (4.810.772 registros):

| Código | Significado | Qtd | % do total |
|---|---|---:|---:|
| 1 | Federal (pública) | 74.649 | 1,55% |
| 2 | Estadual (pública) | 1.382.565 | 28,74% |
| 3 | Municipal (pública) | 9.015 | 0,19% |
| 4 | Privada | 272.799 | 5,67% |
| vazio | Sem informação | 3.071.744 | 63,85% |

**Nenhum código fora de {1,2,3,4}** (validador saiu com código 0). 27 UFs distintas em `SG_UF_PROVA`.

### 9.3 Suíte automatizada

`pytest -q` → **64 passed, 2 warnings** (dados sintéticos; ver seção 4). Esses testes **não** usam o Parquet real.

### 9.4 Endpoint via `TestClient` sobre o Parquet real

Requisições HTTP reais a `POST /api/dados/escola` (não chamadas diretas à função):

| Caso | HTTP | `detail` / observação |
|---|---|---|
| SC, nota 620,5 | **200** | sucesso, com cobertura na mensagem |
| SP, nota 500 | **200** | sucesso, com cobertura na mensagem |
| UF inválida (`XX`) | **422** | "Informe uma UF brasileira válida, por exemplo SC ou SP." |
| Nota inválida (1500) | **422** | "Input should be less than or equal to 1000" |
| Dados indisponíveis (pasta de Parquet vazia) | **503** | "Arquivo resultados_2025.parquet não encontrado…" |

### 9.5 Resultados agregados reais — SC e SP

**Desempenho (percentil, população = presentes em Matemática com nota válida):**

| UF | Nota consultada | Percentil | N (notas válidas) | Excluídos do percentil |
|---|---:|---:|---:|---:|
| SC | 620,5 | 69,55 | 73.267 | 37.192 |
| SP | 500 | 35,59 | 514.500 | 237.112 |

**Composição por dependência administrativa:**

| UF | Total registros UF | Válidos (pública+privada) | Cobertura | Pública {1,2,3} (qtd / % válidos / % total) | Privada {4} (qtd / % válidos / % total) | Sem informação (qtd / % total) |
|---|---:|---:|---:|---|---|---|
| SC | 110.459 | 50.591 | 45,80% | 40.033 / 79,13% / 36,24% | 10.558 / 20,87% / 9,56% | 59.868 / 54,2% |
| SP | 751.612 | 335.937 | 44,70% | 255.625 / 76,09% / 34,01% | 80.312 / 23,91% / 10,69% | 415.675 / 55,3% |

Conferência de consistência (SC): válidos (50.591) + sem informação (59.868) = 110.459 = total da UF ✓. Dos 73.267 presentes em SC, todos tinham nota válida; os 37.192 excluídos do percentil são ausentes/eliminados. 24 presentes com nota exatamente 0,0 entram na base (válidos em [0,1000]).

**Leitura:** a cobertura ~45% confirma que a maioria dos registros não tem dependência administrativa classificada (não-concluintes ou escola não localizada no Censo). Os percentuais pública/privada descrevem **apenas** os registros classificados, não todos os inscritos/presentes da UF. Nenhuma relação causal entre tipo de escola e nota é afirmada — as duas análises permanecem separadas, sem junção.

### 9.6 Como reproduzir

```powershell
# Backend
cd Backend
.venv\Scripts\Activate.ps1
# (com os CSVs reais no caminho do ETL)
python etl/validar_tp_escola.py --linhas 0     # valida a coluna no CSV inteiro
python etl/ingestion.py                        # gera os Parquets em etl/producao/
python etl/validar_tp_escola.py --parquet      # valida o Parquet gerado
pytest -q                                      # 64 passed (dados sintéticos)
uvicorn api.main:app --reload                  # testar POST /api/dados/escola em /docs

# Frontend (PENDENTE — requer Node/npm, indisponível nesta máquina)
cd ..\frontend
npm install
npm run lint
npm run build
npm run dev
```

Os CSVs, os Parquets, a `.venv`, caches e `node_modules` **não** fazem parte da entrega individual (cobertos pelos `.gitignore`).
