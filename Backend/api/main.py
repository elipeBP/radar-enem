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
        FiltroNotaUF,
        RespostaNotaUF,
    )
except ImportError:
    # Funciona quando você roda a partir da raiz de Backend/:
    #   uvicorn api.main:app --reload
    from api.schemas import (
        FiltroGenero,
        RespostaGenero,
        FiltroAreas,
        RespostaAreas,
        FiltroEscola,
        RespostaEscola,
        FiltroNotaUF,
        RespostaNotaUF,
    )

# core/escola.py e core/nota_uf.py vivem fora de api/. Suportam os dois modos
# de execução (de dentro de api/ ou a partir da raiz do Backend), como já
# feito com os schemas.
#
# IMPORTANTE: os dois módulos definem suas próprias classes
# DadosIndisponiveisError/UFsemDadosError, independentes uma da outra. Importar
# as duas sem alias faria a segunda sobrescrever a primeira no namespace deste
# arquivo, e o "except" da rota que importou primeiro pararia de capturar a
# exceção certa (viraria 500 não tratado em vez de 404/503). Por isso cada
# conjunto usa seu próprio par de nomes.
try:
    from core.escola import (
        analisar_tipo_escola,
        DadosIndisponiveisError as DadosIndisponiveisErrorEscola,
        UFsemDadosError as UFsemDadosErrorEscola,
    )
    from core.nota_uf import (
        analisar_nota_uf,
        DadosIndisponiveisError as DadosIndisponiveisErrorNotaUF,
        UFsemDadosError as UFsemDadosErrorNotaUF,
    )
except ImportError:  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from core.escola import (
        analisar_tipo_escola,
        DadosIndisponiveisError as DadosIndisponiveisErrorEscola,
        UFsemDadosError as UFsemDadosErrorEscola,
    )
    from core.nota_uf import (
        analisar_nota_uf,
        DadosIndisponiveisError as DadosIndisponiveisErrorNotaUF,
        UFsemDadosError as UFsemDadosErrorNotaUF,
    )

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
    except UFsemDadosErrorEscola as exc:
        # UF válida sintaticamente, mas sem dados utilizáveis na base.
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DadosIndisponiveisErrorEscola as exc:
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


@app.post("/api/dados/uf", response_model=RespostaNotaUF)
def analise_nota_uf(filtros: FiltroNotaUF):
    """Rota do Filtro 1 — Nota × Estado (issue #48).

    Consulta o percentil e o Z-Score da nota em relação à UF e área escolhidas.
    """
    try:
        dados = analisar_nota_uf(
            estado=filtros.estado,
            area=filtros.area,
            nota_usuario=filtros.nota_usuario,
        )
    except UFsemDadosErrorNotaUF as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DadosIndisponiveisErrorNotaUF as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return RespostaNotaUF(
        status="success",
        mensagem="Análise estatística calculada com os dados de referência do ENEM 2025.",
        dados=dados,
    )
