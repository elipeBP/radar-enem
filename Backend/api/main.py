"""
main.py
-------
Ponto de entrada da API. Aqui só vive a inicialização do FastAPI,
o CORS e as rotas — a validação de dados fica em schemas.py.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    # Funciona quando você roda de dentro da pasta api/:
    #   cd api && uvicorn main:app --reload
    from schemas import FiltroGenero, RespostaGenero
except ImportError:
    # Funciona quando você roda a partir da raiz do projeto:
    #   uvicorn api.main:app --reload
    from api.schemas import FiltroGenero, RespostaGenero

app = FastAPI(
    title="Radar ENEM API",
    description="Backend do projeto Radar ENEM - UniSENAI Florianópolis",
    version="0.1.0",
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

    O FastAPI já recebe o corpo da requisição, valida contra o modelo
    FiltroGenero (definido em schemas.py) e injeta o resultado validado
    aqui como o parâmetro `filtros`. Se a validação falhar, a função
    nem chega a ser chamada — o cliente já recebe um erro 422 detalhado.

    Por enquanto devolvemos um mock (dados simulados), já que a
    ingestão real dos microdados ainda está sendo construída em
    etl/ingestion.py. Isso permite que o time de frontend já comece
    a integrar contra um formato de resposta estável.
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