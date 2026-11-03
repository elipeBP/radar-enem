# Radar ENEM — Instalação do mapa interativo do Brasil

Este guia explica como configurar o frontend do Radar ENEM em outro computador para usar o mapa interativo que permite selecionar as Unidades da Federação (UFs) no Dashboard.

## 1. Pré-requisitos

Instale os seguintes programas:

- **Git**, para baixar e atualizar o repositório.
- **Node.js 20.19+ ou 22.12+**, incluindo o npm. Essas versões atendem aos requisitos documentados do frontend.
- Um editor de código, como o Visual Studio Code (opcional).

**Não é necessária uma extensão específica do VS Code para o mapa funcionar.** `react-simple-maps` é uma biblioteca JavaScript instalada pelo npm, e não uma extensão do editor.

## 2. Atualizar o repositório para a branch do mapa

Abra o terminal na pasta do projeto. Se o repositório já estiver clonado, execute:

```powershell
git switch feature/refatoracao-layout-frontend
git pull origin feature/refatoracao-layout-frontend
```

Se ainda não tiver o repositório, clone-o e depois entre na branch:

```powershell
git clone https://github.com/elipeBP/radar-enem.git
cd radar-enem
git switch feature/refatoracao-layout-frontend
git pull origin feature/refatoracao-layout-frontend
```

> Se o mapa ainda não estiver disponível na branch que sua equipe usa para desenvolvimento, será necessário integrar essa implementação à branch compartilhada antes de seguir estes passos.

## 3. Instalar as dependências do frontend

Entre na pasta `frontend`:

```powershell
cd frontend
```

Instale exatamente as dependências registradas no arquivo `package-lock.json`:

```powershell
npm ci
```

O `package.json` desta implementação já declara `react-simple-maps` na versão configurada `^5.0.5`, além de React e das outras dependências do frontend. Por isso, para quem baixou a branch atualizada, **não é preciso instalar `react-simple-maps` separadamente**.

Se estiver trabalhando em outra branch onde a biblioteca ainda não esteja declarada em `package.json`, adicione-a com:

```powershell
npm install react-simple-maps@^5.0.5
```

Esse segundo comando só é necessário ao incluir a dependência numa branch que ainda não a possui.

## 4. Conferir os arquivos do mapa

Os principais arquivos usados pelo mapa são:

```text
frontend/
├── public/
│   └── data/
│       └── estados.geojson
└── src/
    └── components/
        └── MapaInterativo/
            ├── MapaBrasil.jsx
            └── MapaBrasil.css
```

O arquivo `estados.geojson` contém as geometrias dos estados brasileiros. Ele **já faz parte do repositório** e precisa permanecer no caminho `frontend/public/data/estados.geojson`.

O componente `MapaBrasil.jsx` importa a biblioteca assim:

```jsx
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps/core';
```

O componente carrega o arquivo local pelo caminho `/data/estados.geojson`. Não mova o arquivo para `src/` nem altere o caminho sem também atualizar e testar o componente.

## 5. Iniciar o frontend

Ainda dentro da pasta `frontend`, execute:

```powershell
npm run dev
```

Abra no navegador o endereço indicado pelo terminal, normalmente:

```text
http://localhost:5173
```

Acesse o Dashboard e teste se o mapa aparece. Clique em estados diferentes para confirmar que a seleção e a remoção da seleção funcionam.

## 6. Verificar se a biblioteca está instalada

Dentro de `frontend`, execute:

```powershell
npm ls react-simple-maps
```

O comando deve listar a dependência sem indicar que ela está ausente.

Também é possível confirmar se o GeoJSON está sendo servido corretamente: com o servidor Vite ligado, abra:

```text
http://localhost:5173/data/estados.geojson
```

O navegador deve exibir um JSON. O componente espera uma coleção GeoJSON com `type: "FeatureCollection"` e as geometrias dos estados.

## 7. Solução de problemas

### Erro de importação de `react-simple-maps`

Confirme que está na branch `feature/refatoracao-layout-frontend`. Depois, dentro de `frontend`, reinstale as dependências registradas no lockfile:

```powershell
npm ci
npm run dev
```

### O mapa não aparece ou fica carregando

1. Confirme que `frontend/public/data/estados.geojson` existe.
2. Abra `http://localhost:5173/data/estados.geojson` e veja se o arquivo é retornado.
3. Confira o Console e a aba Network nas ferramentas de desenvolvedor do navegador, procurando erros de JavaScript ou uma resposta diferente de HTTP 200 para o GeoJSON.
4. Confirme que o comando `npm run dev` foi executado na pasta `frontend`.

### Validar a compilação

Para verificar se o frontend compila corretamente, dentro de `frontend` execute:

```powershell
npm run build
```

## Resumo dos comandos

Para um integrante que já tem o repositório e precisa preparar o frontend pela primeira vez nesta máquina:

```powershell
git switch feature/refatoracao-layout-frontend
git pull origin feature/refatoracao-layout-frontend
cd frontend
npm ci
npm run dev
```

O essencial é atualizar para a branch que contém o mapa, manter o GeoJSON no caminho esperado e instalar as dependências com `npm ci`. Não é necessário copiar `node_modules` de outro computador nem versionar essa pasta no Git.
