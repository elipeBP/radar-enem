"""
main.py
-------
Ponto de entrada da API. Aqui só vive a inicialização do FastAPI,
o CORS, as rotas e o serviço do build estático do frontend (Docker,
container único) -- a validação de dados fica em schemas.py, a leitura
dos Parquets fica em core/dados.py (sob demanda, sem pré-carregar nada
no startup -- ver #17).
"""

import os
import sys
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
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

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
        FiltroIdade,
        RespostaIdade,
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
        FiltroIdade,
        RespostaIdade,
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
    from core.faixa_etaria import (
        analisar_faixa_etaria,
        DadosIndisponiveisError as DadosIndisponiveisErrorIdade,
        UFsemDadosError as UFsemDadosErrorIdade,
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
    from core.faixa_etaria import (
        analisar_faixa_etaria,
        DadosIndisponiveisError as DadosIndisponiveisErrorIdade,
        UFsemDadosError as UFsemDadosErrorIdade,
    )

from core.dados import DadosIndisponiveisError, carregar_dados_genero
from core.genero import AnoIndisponivelError, EstadosSemDadosError, analisar_genero

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
    Rota do módulo "Trilha de Gênero nas Exatas" (#37).

    Devolve dois blocos independentes: nota x UF (percentil/Z-Score reais,
    fonte RESULTADOS_<ano>) e composição demográfica (% de mulheres entre os
    inscritos, fonte PARTICIPANTES_<ano>). A regra de negócio fica em
    core/genero.py; aqui só recebemos, chamamos e traduzimos erros em HTTP.

    Leitura sob demanda, filtrada por UF já no Parquet (#17, ver
    core/dados.py:carregar_dados_genero) -- nunca o arquivo inteiro em
    memória. Um app.state pré-carregado no startup chegou a estourar os
    512MB de RAM do free tier do Render (ver histórico do #17); essa
    abordagem evita isso pra qualquer ano, sem precisar de cache.
    """
    try:
        df_resultados, df_participantes = carregar_dados_genero(
            filtros.ano, filtros.estados
        )
    except AnoIndisponivelError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except DadosIndisponiveisError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        dados = analisar_genero(
            df_resultados,
            df_participantes,
            ano=filtros.ano,
            estados=filtros.estados,
            nota_usuario=filtros.nota_matematica,
        )
    except AnoIndisponivelError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except EstadosSemDadosError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return RespostaGenero(
        status="success",
        mensagem=f"Análise calculada a partir dos microdados reais do ENEM {filtros.ano}.",
        dados=dados,
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


@app.post("/api/dados/idade", response_model=RespostaIdade)
def analise_faixa_etaria(filtros: FiltroIdade):
    """
    Rota do Filtro 5 — Faixa Etária (issue #52).

    Calcula, para a UF informada, duas análises INDEPENDENTES, sem junção
    entre elas (mesma arquitetura da Trilha de Gênero):
      A) o percentil/Z-Score da nota de Matemática do usuário entre as
         notas válidas da UF (fonte RESULTADOS);
      B) a composição por faixa etária dos inscritos da UF, nos 20
         códigos oficiais de TP_FAIXA_ETARIA (fonte PARTICIPANTES).

    Mapeamento de erros:
      - 422: entrada inválida (tratado automaticamente pelo FastAPI/Pydantic);
      - 404: a UF não tem registros/notas utilizáveis na base de referência;
      - 503: os Parquets de referência estão ausentes, corrompidos ou sem as
             colunas necessárias (problema de dados no servidor, não do cliente).
    """
    try:
        dados = analisar_faixa_etaria(
            estado=filtros.estado,
            nota_matematica=filtros.nota_matematica,
        )
    except UFsemDadosErrorIdade as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DadosIndisponiveisErrorIdade as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return RespostaIdade(
        status="success",
        mensagem="Análise por faixa etária calculada com os microdados de referência do ENEM 2025.",
        dados=dados,
    )


class SPAStaticFiles(StaticFiles):
    """StaticFiles com fallback de SPA.

    O `html=True` do Starlette só serve 'index.html' pra raiz ou caminhos
    de diretório -- um caminho inexistente como '/areas' (rota do React
    Router) continua dando 404 de verdade, porque não existe esse arquivo.
    Sem esse fallback, dar F5 em qualquer página que não seja "/" quebra
    em produção.

    `StaticFiles.get_response` levanta HTTPException(404) em vez de
    devolver uma Response com status 404 -- confirmado lendo o código-fonte
    do Starlette instalado. É a `starlette.exceptions.HTTPException`, não a
    `fastapi.HTTPException` (subclasse dela): testado manualmente que
    capturar a classe do FastAPI aqui NÃO funciona -- uma instância da
    classe-mãe não é instância da subclasse, então o except nunca pega e
    '/areas' continua 404. Por isso o import separado acima.

    O fallback só vale para caminhos que NÃO começam com "/api/": esse mount
    é um catch-all, então qualquer chamada a uma rota de API inexistente
    (ex: typo do cliente) também cai aqui -- sem essa checagem, um erro de
    integração vira silenciosamente um 200 com o index.html em vez de um
    404 de verdade (testado manualmente: sem a checagem, '/api/rota-que-
    -nao-existe' respondia 200 com HTML).

    A checagem usa `scope["path"]` (a URL original, sempre com "/", pelo
    padrão ASGI) e não o `path` recebido aqui: esse `path` já vem normalizado
    por `os.path.join`/`os.path.normpath` com o separador do SO -- no
    Windows vira "api\\rota", nunca bate com "api/" e o guard não funciona
    (testado manualmente). Em produção (container Linux) isso coincidiria
    por acaso, mas não dá pra depender disso.
    """

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            eh_rota_de_api = scope.get("path", "").startswith("/api/")
            if exc.status_code == 404 and not eh_rota_de_api:
                return await super().get_response("index.html", scope)
            raise


# ---------------------------------------------------------------------------
# Frontend estático: se a pasta 'static' existir (gerada pelo build do
# Docker, ver Dockerfile), serve os arquivos compilados do React na raiz.
# Precisa vir DEPOIS de todas as rotas /api/*: a ordem de registro decide a
# prioridade de match, e o mount("/") é um catch-all -- se viesse antes,
# engoliria as rotas da API.
# ---------------------------------------------------------------------------
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")
