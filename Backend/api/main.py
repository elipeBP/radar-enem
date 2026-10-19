"""
main.py
-------
Ponto de entrada da API. Aqui só vive a inicialização do FastAPI,
o CORS e as rotas — a validação de dados fica em schemas.py.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from core.analise_areas import analisar_areas

try:
    # Funciona quando você roda de dentro da pasta api/:
    #   cd api && uvicorn main:app --reload
    from schemas import (
        FiltroGenero,
        RespostaGenero,
        FiltroAreas,
        RespostaAreas,
        FiltroEscola,
        RespostaEscola,
    )
except ImportError:
    # Funciona quando você roda a partir da raiz do projeto:
    #   uvicorn api.main:app --reload
    from api.schemas import (
        FiltroGenero,
        RespostaGenero,
        FiltroAreas,
        RespostaAreas,
        FiltroEscola,
        RespostaEscola,
    )

# core/escola.py vive fora de api/. Suporta os dois modos de execução (de
# dentro de api/ ou a partir da raiz do Backend), como já feito com os schemas.
try:
    from core.escola import (
        analisar_tipo_escola,
        DadosIndisponiveisError,
        UFsemDadosError,
    )
except ImportError:  # pragma: no cover
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from core.escola import (
        analisar_tipo_escola,
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


@app.post("/api/dados/areas", response_model=RespostaAreas)
def analise_areas(filtros: FiltroAreas):
    dados = analisar_areas(
        nota_cn=filtros.nota_cn,
        nota_ch=filtros.nota_ch,
        nota_lc=filtros.nota_lc,
        nota_mt=filtros.nota_mt,
        nota_redacao=filtros.nota_redacao,
    )

    return RespostaAreas(
        status="success",
        mensagem="Análise comparativa por área realizada com sucesso.",
        dados=dados,
    )


@app.post("/api/dados/escola", response_model=RespostaEscola)
def analise_tipo_escola(filtros: FiltroEscola):
    """
    Rota do Filtro 4 — Tipo de Escola (issue #51).

    Calcula, para a UF informada, duas análises INDEPENDENTES a partir da base
    de resultados (sem junção com participantes):
      A) o percentil da nota de Matemática do usuário entre os presentes da UF;
      B) a composição pública × privada por TP_DEPENDENCIA_ADM_ESC, com os
         denominadores e a cobertura explicitados.

    Mapeamento de erros:
      - 422: entrada inválida (tratado automaticamente pelo FastAPI/Pydantic);
      - 404: a UF não tem registros/notas utilizáveis na base de referência;
      - 503: os Parquets de referência estão ausentes, corrompidos ou sem as
             colunas necessárias (problema de dados no servidor, não do cliente).
    """
    try:
        dados = analisar_tipo_escola(
            estado=filtros.estado,
            nota_matematica=filtros.nota_matematica,
        )
    except UFsemDadosError as exc:
        # UF válida sintaticamente, mas sem dados utilizáveis na base.
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DadosIndisponiveisError as exc:
        # Falha de dados no servidor (Parquet ausente/corrompido/sem colunas).
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    composicao = dados["composicao_escolar"]
    mensagem = "Análise por tipo de escola calculada com os microdados de referência do ENEM 2025."
    if not composicao["mapeamento_confirmado"]:
        mensagem += (
            " Atenção: a codificação de dependência administrativa ainda não foi conferida"
            " no dicionário oficial de 2025; trate a composição como provisória."
        )
    cobertura = composicao.get("cobertura")
    if cobertura is not None:
        mensagem += (
            f" A composição pública × privada cobre {cobertura:.2f}% dos registros da UF"
            " (apenas quem teve a escola de conclusão identificada no Censo Escolar)."
        )
    return RespostaEscola(status="success", mensagem=mensagem, dados=dados)
