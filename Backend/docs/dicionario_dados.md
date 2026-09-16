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
- [ ] **Decisão do time:** como proceder diante da ausência de chave de
      junção entre PARTICIPANTES e RESULTADOS (levar para #22)