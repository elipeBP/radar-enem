# Radar ENEM

Plataforma web onde qualquer pessoa insere sua nota do ENEM e seu perfil socioeconômico e recebe,
em tempo real, um diagnóstico estatístico do seu posicionamento frente à população brasileira
(percentil e Z-Score) — cruzando isso com recortes como gênero, acesso digital, região e tipo de
escola.

Projeto Integrador da disciplina **Projeto Aplicado III**, curso de Bacharelado em Ciência de
Dados e Inteligência Artificial — Centro Universitário SENAI/SC (Florianópolis), sob orientação do
professor Gustavo Stangherlin Cantarelli.

O desafio técnico central: os Microdados do ENEM (INEP) somam vários GB, o que inviabiliza
processamento tradicional em memória RAM — daí a escolha por Polars/DuckDB em vez de Pandas, e por
um formato Parquet otimizado em vez de reler o CSV bruto a cada consulta.

## Estrutura do repositório

Monorepo com dois serviços independentes:

```
radar-enem/
├── Backend/     # API (FastAPI) + ETL (Polars) — ver Backend/README.md
├── frontend/    # Interface (React + Vite + Tailwind) — ver frontend/README.md
└── README.md    # este arquivo
```

## Rodando o projeto localmente

Os dois serviços rodam em paralelo, em terminais separados.

**Backend** (porta `8000`, docs interativas em `/docs`) — setup completo em
[`Backend/README.md`](Backend/README.md):

```bash
cd Backend
python -m venv venv && source venv/Scripts/activate   # Windows
pip install -r requirements.txt
cd api && uvicorn main:app --reload
```

**Frontend** (porta `5173`) — requer Node.js instalado:

```bash
cd frontend
npm install
npm run dev
```

Com os dois no ar, o Dashboard mostra o status da conexão com a API em tempo real.

## Arquitetura

```
CSV bruto (INEP) --[ETL offline, Polars]--> Parquet otimizado --> S3 --> EC2 (Parquet local) --> API (FastAPI) <--> Frontend (React)
```

- ETL roda offline (não em tempo real): lê o CSV bruto, seleciona e tipa as colunas necessárias, e
  gera um Parquet comprimido.
- A API nunca lê o CSV bruto nem consulta o S3 por requisição — ela lê um Parquet local
  sincronizado na instância EC2 no deploy.
- Cada módulo de análise (Trilha de Gênero nas Exatas, Abismo Digital, Peso do CEP, Equidade de
  Escolas) segue o mesmo padrão: uma rota `POST /api/dados/<módulo>`, um par de schemas Pydantic
  (`FiltroX`/`RespostaX`), e o mesmo motor estatístico compartilhado de percentil/Z-Score.

Decisões detalhadas de arquitetura: [issue #22](../../issues/22).

## Equipe

| Pessoa | Papel |
|---|---|
| Felipe Benites | Tech Lead, Cloud/DevOps — dono do repositório, revisa e aprova todos os PRs, integração Front↔Back, provisionamento AWS |
| Jade Oliveira | Frontend — React (Vite + Tailwind) |
| Rafael Nunes Almeida | Dados/Backend — FastAPI + ETL (Polars) |
| Maykon Douglas | Documentação — relatórios e apresentações entregues no AVA |

## Contribuindo

- Ninguém commita direto na `main` — a branch é protegida (revisão obrigatória, sem exceção nem
  para administradores do repositório).
- Todo mundo trabalha em uma branch própria (`feature/...`) e abre PR **a partir da própria conta
  do GitHub** — o GitHub não deixa quem abriu o PR aprovar o próprio PR, então um PR aberto pela
  conta errada trava a revisão de qualquer um.
- Cada PR precisa de pelo menos 1 aprovação antes do merge.

## Status

Sprint 1 (ambiente 100% local) concluída — ver [issues fechadas](../../issues?q=is%3Aissue+is%3Aclosed).
Sprint 2 em andamento: provisionamento AWS ([#17](../../issues/17)) e implementação real dos
endpoints de análise ([#33](../../issues/33)–[#39](../../issues/39)).
