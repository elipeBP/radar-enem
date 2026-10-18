"""
main.py
-------
Ponto de entrada da API. Aqui só vive a inicialização do FastAPI,
o CORS e as rotas — a validação de dados fica em schemas.py.
"""


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from schemas import (
        FiltroGenero,
        RespostaGenero,
        FiltroNotaUF,
        RespostaNotaUF,
    )
except ImportError:
    from api.schemas import (
        FiltroGenero,
        RespostaGenero,
        FiltroNotaUF,
        RespostaNotaUF,
    )

try:
    from core.nota_uf import (
        analisar_nota_uf,
        DadosIndisponiveisError,
        UFsemDadosError,
    )
except ImportError:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

    from core.nota_uf import (
        analisar_nota_uf,
        DadosIndisponiveisError,
        UFsemDadosError,
    )


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
@app.post("/api/dados/uf", response_model=RespostaNotaUF)
def analise_nota_uf(filtros: FiltroNotaUF):
    """Consulta o percentil e o Z-Score da nota em relação à UF e área escolhidas."""

    try:
        dados = analisar_nota_uf(
            estado=filtros.estado,
            area=filtros.area,
            nota_usuario=filtros.nota_usuario,
        )
    except UFsemDadosError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc
    except DadosIndisponiveisError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return RespostaNotaUF(
        status="success",
        mensagem="Análise estatística calculada com os dados de referência do ENEM 2025.",
        dados=dados,
    )