"""
main.py
-------
Ponto de entrada da API. Aqui só vive a inicialização do FastAPI,
o CORS, o carregamento dos dados (#36) e as rotas -- a validação de
dados fica em schemas.py, a leitura dos Parquets fica em core/dados.py.
"""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Garante que a pasta Backend/ (pai de api/) está no caminho de busca do
# Python, não importa de onde o uvicorn for executado (de dentro de
# api/ ou da raiz de Backend/). Sem isso, "from core.dados import ..."
# falha com ModuleNotFoundError quando rodado de dentro de api/: só a
# própria pasta api/ entra automaticamente no caminho de busca nesse
# caso, e core/ é uma pasta IRMÃ de api/, não uma pasta dentro dela.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    # Funciona quando você roda de dentro da pasta api/:
    #   cd api && uvicorn main:app --reload
    from schemas import FiltroGenero, RespostaGenero
except ImportError:
    # Funciona quando você roda a partir da raiz de Backend/:
    #   uvicorn api.main:app --reload
    from api.schemas import FiltroGenero, RespostaGenero

from core.dados import carregar_participantes, carregar_resultados


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Roda uma vez quando a API sobe (não a cada requisição).

    Carrega os dois Parquets de produção (#34) e guarda em `app.state`,
    que é um espaço de memória compartilhado por toda a aplicação
    enquanto o processo estiver no ar -- assim nenhuma rota precisa
    reler o arquivo do disco a cada chamada.
    """
    app.state.df_resultados = carregar_resultados()
    app.state.df_participantes = carregar_participantes()
    print(
        f"[startup] resultados_2025.parquet: {app.state.df_resultados.height:,} linhas | "
        f"participantes_2025.parquet: {app.state.df_participantes.height:,} linhas"
    )

    yield  # a API fica no ar aqui, respondendo requisições

    # Nada a limpar no shutdown: os DataFrames são liberados da memória
    # automaticamente quando o processo da API termina.


app = FastAPI(
    title="Radar ENEM API",
    description="Backend do projeto Radar ENEM - UniSENAI Florianópolis",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS: libera o frontend (React) rodando em outra origem/porta a chamar
# esta API. Sem isso, o navegador bloqueia a requisição por segurança.
# ---------------------------------------------------------------------------
origins = [
    "http://localhost:5173",  # Vite (padrão do create-react-app moderno)
    "http://localhost:3000",  # Create React App clássico
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """
    Rota simples de 'sinal de vida'. O React (ou qualquer serviço de
    monitoramento) pode chamar isso pra confirmar que a API está no ar
    antes de tentar rotas mais pesadas.
    """
    return {"status": "Radar ENEM API Online"}


@app.post("/api/dados/genero", response_model=RespostaGenero)
def analise_genero(filtros: FiltroGenero):
    """
    Rota do módulo "Trilha de Gênero nas Exatas".

    Ainda devolve um mock (dados simulados) -- ligar essa rota aos
    DataFrames reais carregados em app.state (via core/estatistica.py)
    é escopo do #37, não deste ticket (#36). O #36 só garante que os
    dados reais já estão carregados em memória, prontos pra serem
    consumidos quando o #37 substituir este mock.
    """
    dados_mock = {
        "percentil_usuario": 82.4,
        "media_grupo_filtrado": 645.3,
        "ano_referencia": filtros.ano,
        "estado_referencia": filtros.estado,
    }

    return RespostaGenero(
        status="success",
        mensagem="Dados simulados retornados com sucesso (mock).",
        dados=dados_mock,
    )