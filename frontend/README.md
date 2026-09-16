# Radar ENEM — Frontend

Frontend do projeto **Radar ENEM**, um produto de dados desenvolvido para apoiar a análise de indicadores educacionais e desigualdades de desempenho no ENEM.

A aplicação foi construída com **React + Vite + TailwindCSS** e consome uma API local desenvolvida com FastAPI.

---

## Tecnologias

- React
- Vite
- TailwindCSS
- JavaScript
- Fetch API
- Oxlint

---

## Requisitos

Para executar o projeto localmente é necessário ter:

- Node.js 20.19+ ou 22.12+
- npm
- Backend do Radar ENEM disponível para os testes de integração

---

## Instalação

Clone o repositório e acesse a pasta do frontend:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

Por padrão, o Vite disponibiliza a aplicação em:

```text
http://localhost:5173
```

---

## Estrutura principal

```text
frontend/
├── public/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── StatusBadge.jsx
│   │   └── ResultadoGenero.jsx
│   │
│   ├── services/
│   │   └── api.jsx
│   │
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── package.json
├── package-lock.json
└── vite.config.js
```

---

## Funcionalidades implementadas

### Dashboard

O Dashboard possui uma Sidebar para seleção dos filtros e uma área principal para exibição das informações.

Filtros disponíveis:

- Ano do ENEM;
- Estados;
- Nota de Matemática.

Os filtros são controlados com `useState` no React.

---

## Seleção de estados

A seleção de estados utiliza checkboxes, permitindo escolher múltiplas UFs de forma mais intuitiva.

Exemplo:

```text
☑ SC
☑ PR
☑ RS
```

Internamente, os estados são armazenados como uma lista:

```js
['SC', 'PR', 'RS']
```

Também estão disponíveis as ações:

- Selecionar todos;
- Limpar seleção.

---

## Integração com a API

A comunicação HTTP está centralizada em:

```text
src/services/api.jsx
```

A URL utilizada atualmente é:

```text
http://localhost:8000
```

### Health Check

Ao carregar a aplicação, o frontend realiza:

```http
GET /api/health
```

O resultado é exibido pelo componente `StatusBadge`.

Estados possíveis:

```text
🟡 Verificando conexão
🟢 API Online
🔴 API Offline
```

---

## Consulta por gênero

A função:

```js
consultarGenero(filtros)
```

realiza:

```http
POST /api/dados/genero
```

A consulta só é disparada quando o usuário clica no botão:

```text
Consultar
```

Alterações individuais nos filtros não realizam requisições automaticamente.

---

## Payload da consulta

O frontend trabalha internamente com o seguinte formato:

```json
{
  "ano": 2024,
  "estados": ["SC", "PR"],
  "nota_matematica": 650
}
```

O campo `estados` é mantido como lista para suportar a seleção de múltiplas UFs.

### Compatibilidade temporária com o backend

O contrato atual do backend ainda utiliza uma única propriedade:

```json
{
  "estado": "SC"
}
```

Por isso existe uma adaptação temporária na camada de serviço para permitir os testes com a API atual.

Quando o backend passar a aceitar:

```json
{
  "estados": ["SC", "PR"]
}
```

essa compatibilidade poderá ser removida e a lista completa será enviada diretamente.

---

## Estados da requisição

A consulta possui tratamento para diferentes situações.

### Loading

Enquanto a API está processando a consulta:

```text
Consultando...
```

O botão também permanece desabilitado temporariamente, evitando requisições duplicadas.

### Erro de conexão

Caso o backend esteja indisponível, é apresentada uma mensagem clara:

```text
Não foi possível conectar à API.
Verifique se o backend está online.
```

A aplicação continua utilizável e não fica presa no estado de carregamento.

### Erro de validação — HTTP 422

A aplicação também possui tratamento para respostas:

```text
422 Unprocessable Entity
```

Nesse caso, uma mensagem de validação é exibida ao usuário.

---

## Resultado da consulta

O resultado da consulta é exibido pelo componente:

```text
src/components/ResultadoGenero.jsx
```

O componente utiliza os dados retornados por:

```http
POST /api/dados/genero
```

Atualmente são utilizados principalmente:

```json
{
  "percentil_usuario": 82.4,
  "media_grupo_filtrado": 645.3
}
```

---

## Percentil do usuário

O percentil é exibido de forma visual:

```text
82,4º percentil
```

Também é utilizada uma barra de progresso para representar a posição do usuário no grupo filtrado.

Exemplo:

```text
Você está no percentil 82,4 do grupo filtrado.

████████████████████░░░░
```

---

## Média do grupo filtrado

A média retornada pela API é apresentada separadamente para permitir comparação.

Exemplo:

```text
Média do grupo filtrado

645,3 pontos em Matemática
```

---

## Estado vazio

Antes de realizar a primeira consulta, o Dashboard não apresenta uma área vazia.

O componente mostra uma orientação ao usuário para selecionar os filtros e realizar a consulta.

Exemplo:

```text
Faça sua consulta.

Preencha os filtros ao lado e clique em Consultar
para visualizar sua posição em relação ao grupo selecionado.
```

---

## Formato atual da resposta da API

A API retorna atualmente uma estrutura semelhante a:

```json
{
  "status": "success",
  "mensagem": "Dados simulados retornados com sucesso (mock).",
  "dados": {
    "percentil_usuario": 82.4,
    "media_grupo_filtrado": 645.3,
    "ano_referencia": 2024,
    "estado_referencia": "SC"
  }
}
```

No frontend, os dados utilizados pelo componente de resultado são obtidos por:

```js
const resposta = await consultarGenero(filtros)

setResultado(resposta.dados)
```

---

## Dados mockados

A integração frontend/backend já está funcional.

Entretanto, os valores de:

```text
percentil_usuario
media_grupo_filtrado
```

ainda são simulados pelo backend.

O frontend já está preparado para receber os dados reais assim que a lógica de processamento dos microdados do ENEM substituir o mock atual.

---

## Fluxo da aplicação

```text
Usuário seleciona filtros
        ↓
Ano + Estados + Nota
        ↓
Clica em Consultar
        ↓
loading = true
        ↓
POST /api/dados/genero
        ↓
FastAPI
        ↓
Resposta
        ↓
resposta.dados
        ↓
ResultadoGenero
        ↓
Percentil + Média do grupo
```

Em caso de erro:

```text
POST
 ↓
Erro 422 ou falha de conexão
 ↓
Mensagem de erro
 ↓
loading = false
 ↓
Aplicação continua utilizável
```

---

## Executando frontend e backend juntos

Para testar a integração completa, execute os dois projetos simultaneamente.

### Backend

Em outro terminal:

```bash
cd backend
python -m uvicorn api.main:app --reload
```

A API ficará disponível em:

```text
http://localhost:8000
```

### Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:5173
```

---

## Status atual

Implementado:

- [x] React + Vite
- [x] TailwindCSS
- [x] Dashboard inicial
- [x] Sidebar
- [x] Filtro por ano
- [x] Seleção múltipla de estados
- [x] Input de nota de Matemática
- [x] Health-check da API
- [x] Indicador online/offline
- [x] POST para `/api/dados/genero`
- [x] Botão Consultar
- [x] Estado de loading
- [x] Tratamento de API offline
- [x] Tratamento de HTTP 422
- [x] Componente `ResultadoGenero`
- [x] Visualização do percentil
- [x] Visualização da média do grupo
- [x] Estado vazio antes da consulta
- [x] Integração frontend/backend contra o mock atual
- [ ] Envio definitivo da lista completa de estados após atualização do contrato do backend
- [ ] Substituição dos dados mockados pelos dados reais processados dos microdados do ENEM

---

## Próximos passos

Os próximos ajustes dependem principalmente da evolução do backend:

1. Atualizar o contrato de `/api/dados/genero` para receber múltiplos estados;
2. Remover a camada temporária de compatibilidade com `estado`;
3. Consumir os cálculos reais de percentil e média;
4. Validar a integração ponta a ponta com os microdados processados do ENEM.

---

## Projeto Radar ENEM

Produto de dados desenvolvido no contexto acadêmico da UniSENAI Florianópolis para análise de indicadores e desigualdades educacionais utilizando dados do ENEM.
