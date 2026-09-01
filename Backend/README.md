# Radar ENEM — Backend

Backend do projeto integrador **Radar ENEM**, da disciplina Projeto Aplicado III
(Bacharelado em Ciência de Dados e Inteligência Artificial — UniSENAI Florianópolis).

O Radar ENEM é uma plataforma web onde o usuário insere sua nota do ENEM e
seu perfil socioeconômico para obter, em tempo real, um diagnóstico
estatístico do seu posicionamento frente à população brasileira.

Esta pasta (`Backend/`) faz parte do monorepo do projeto, ao lado da pasta
`frontend/` (React). Ela cobre:
- **API** (FastAPI): recebe requisições do frontend e devolve os
  diagnósticos calculados.
- **ETL** (Polars): ingestão e compressão offline dos Microdados do ENEM
  (INEP), convertendo os CSVs brutos em Parquet para consulta rápida.

## Estrutura de pastas

```
radar-enem/                     (raiz do repositório)
└── Backend/                    # você está aqui
    ├── api/
    │   ├── main.py              # inicialização do FastAPI, CORS e rotas
    │   └── schemas.py           # modelos Pydantic (contratos de entrada/saída)
    ├── etl/
    │   ├── ingestion.py         # ingestão amostral dos microdados com Polars
    │   └── microdados_enem_2025/   # dados brutos do INEP (não versionado, ver .gitignore)
    ├── venv/                    # ambiente virtual (não versionado)
    ├── requirements.txt
    ├── .gitignore
    └── README.md                # este arquivo
```

## Por que essa stack?

| Ferramenta | Papel |
|---|---|
| **FastAPI** | Framework da API — define rotas, valida dados, gera documentação automática |
| **Uvicorn** | Servidor que efetivamente roda a API e escuta requisições HTTP |
| **Pydantic** | Validação e contratos de dados (integrado ao FastAPI) |
| **Polars** | Processamento dos microdados do ENEM sem estourar a memória RAM (ao contrário do Pandas, que carrega tudo de uma vez) |

## Pré-requisitos

- Python 3.10+ instalado
- Os arquivos brutos dos Microdados do ENEM (ver seção "Dados brutos" abaixo)
  — eles **não vêm** com o repositório, cada pessoa precisa baixar por conta própria

## Como rodar

### 1. Ambiente virtual e dependências

A partir da pasta `Backend/`:

```bash
python -m venv venv

# Windows
source venv/Scripts/activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Sempre que abrir um terminal novo, é preciso reativar a venv (`source venv/Scripts/activate`)
antes de rodar qualquer comando abaixo — sem isso, aparece
`ModuleNotFoundError`, já que os pacotes ficam instalados só dentro da venv.

### 2. Rodar a API

De dentro da pasta `Backend/api/`:

```bash
cd api
uvicorn main:app --reload
```

A API sobe em `http://127.0.0.1:8000`. A documentação interativa (gerada
automaticamente pelo FastAPI) fica em `http://127.0.0.1:8000/docs` — é o
jeito mais fácil de testar as rotas sem precisar do frontend rodando.

### 3. Rodar a ingestão de dados (ETL)

Baixe os Microdados do ENEM no
[Portal INEP](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enem)
e extraia dentro de `Backend/etl/microdados_enem_2025/` (essa pasta não é
versionada no git — cada integrante precisa ter os dados localmente).

Depois, de dentro de `Backend/`:

```bash
python etl/ingestion.py
```

Isso lê uma amostra de 100 linhas do `PARTICIPANTES_2025.csv`, imprime o
schema inferido e gera `etl/trusted_amostra.parquet`.

## Dados brutos: como o INEP organiza o .zip

Vale documentar aqui porque não é óbvio na primeira vez: o `.zip` do INEP
não extrai um único CSV solto — ele vem com subpastas, e às vezes o
próprio `.zip` já contém uma pasta com o mesmo nome por dentro (o que gera
uma estrutura duplicada tipo `microdados_enem_2025/microdados_enem_2025/`).
Dentro, a pasta relevante é `DADOS/`, que contém três arquivos separados:

- `PARTICIPANTES_2025.csv` — perfil de inscrição/socioeconômico de cada participante
- `RESULTADOS_2025.csv` — notas de cada participante em cada área da prova
- `ITENS_PROVA_2025.csv` — metadados das questões da prova (dificuldade, gabarito etc.)

Os arquivos usam `;` como separador de colunas e encoding `latin1` (não
UTF-8) — isso já está tratado no `ingestion.py`.

A pasta `DICIONÁRIO/` (também dentro do `.zip`) não tem dados, só a
documentação explicando o que cada coluna significa — vale consultar
antes de escrever qualquer análise que dependa de uma coluna específica.

## Endpoints disponíveis

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Checa se a API está no ar. Retorna `{"status": "Radar ENEM API Online"}` |
| `POST` | `/api/dados/genero` | Recebe `{ano, estado, nota_matematica}` e devolve um diagnóstico. **Atualmente retorna dados mock** — a leitura real dos microdados ainda não está integrada |

## Próximos passos

- Substituir o mock em `/api/dados/genero` pela leitura real dos dados
  processados pela ingestão.
- Cruzar `PARTICIPANTES_2025.csv` com `RESULTADOS_2025.csv` (via
  `NU_INSCRICAO` ou identificador equivalente) para relacionar perfil
  socioeconômico com notas.
- Rodar a ingestão completa (não apenas a amostra de 100 linhas) usando o
  modo *lazy* do Polars, para lidar com o volume total do arquivo.

## Equipe

Projeto desenvolvido por Felipe Benites, Jade Oliveira, Maykon Douglas e
Rafael Nunes Almeida, sob orientação do professor Gustavo Stangherlin
Cantarelli (UniSENAI Campus Florianópolis).