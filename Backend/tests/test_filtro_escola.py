"""Testes do Filtro 4 — Tipo de Escola (issue #51).

Modelagem (confirmada no dicionário oficial 2025): a composição pública ×
privada usa TP_DEPENDENCIA_ADM_ESC da base de RESULTADOS (1=Federal, 2=Estadual,
3=Municipal → pública; 4=Privada → privada), e o percentil usa NU_NOTA_MT entre
os presentes em Matemática (TP_PRESENCA_MT == 1). Não há junção com a base de
participantes.

TODOS os dados aqui são SINTÉTICOS, criados apenas para verificar regras de
cálculo e validação. Não representam resultados do ENEM.

Rodar em Backend/: pytest tests/test_filtro_escola.py -v
"""

import math

import polars as pl
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import core.escola as escola
from api.main import app
from api.schemas import FiltroEscola
from core.escola import (
    DadosIndisponiveisError,
    UFsemDadosError,
    analisar_tipo_escola,
    calcular_composicao_escolar,
)
from etl.ingestion import COLUNAS_RESULTADOS, TIPOS_RESULTADOS, ler_csv_producao


# ---------------------------------------------------------------------------
# Dados sintéticos (base única de RESULTADOS)
# ---------------------------------------------------------------------------
def resultados_teste() -> pl.DataFrame:
    """Base sintética de resultados.

    SC (dependência): 1,2,3 (pública ×3), 4 (privada ×1), vazio (sem info ×1),
       "9" (não previsto ×1), e uma linha extra sem dependência para a nota nula.
    SC (presença/nota): presentes com notas 100, 200, 200, 300; 1 ausente (0,0
       que NÃO deve entrar); 1 presente com nota nula.
    SP: 2 presentes com notas altas.
    """
    return pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC", "SC", "SC", "SC", "SC", "SC", "SP", "SP"],
        "TP_PRESENCA_MT": [1, 1, 1, 1, 0, 1, 1, 1, 1],
        "NU_NOTA_MT": [100.0, 200.0, 200.0, 300.0, 0.0, None, 450.0, 950.0, 990.0],
        "TP_DEPENDENCIA_ADM_ESC": ["1", "2", "3", "4", "2", "1", "", "4", "9"],
    })


def _categoria(composicao, chave):
    return next(c for c in composicao["categorias"] if c["chave"] == chave)


def _excluido(composicao, chave, codigo=None):
    return next(
        e for e in composicao["excluidos"]
        if e["chave"] == chave and (codigo is None or e["codigo"] == codigo)
    )


# ---------------------------------------------------------------------------
# Camada B — composição por dependência administrativa
# ---------------------------------------------------------------------------
def test_publica_agrega_federal_estadual_municipal():
    # SC: dependências = 1,2,3,4,2(ausente conta p/ composição),"",9 → publica=4, privada=1
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC"] * 4,
        "TP_PRESENCA_MT": [1, 1, 1, 1],
        "NU_NOTA_MT": [500.0, 500.0, 500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": ["1", "2", "3", "4"],
    })
    comp = calcular_composicao_escolar(df, "SC")
    publica = _categoria(comp, "publica")
    privada = _categoria(comp, "privada")
    assert publica["quantidade"] == 3           # Federal + Estadual + Municipal
    assert publica["codigos"] == [1, 2, 3]
    assert privada["quantidade"] == 1           # Privada
    assert comp["total_validos"] == 4
    assert publica["percentual_validos"] == 75.0
    assert privada["percentual_validos"] == 25.0


def test_privada_classifica_codigo_4():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["RJ", "RJ"],
        "TP_PRESENCA_MT": [1, 1],
        "NU_NOTA_MT": [600.0, 600.0],
        "TP_DEPENDENCIA_ADM_ESC": ["4", "4"],
    })
    comp = calcular_composicao_escolar(df, "RJ")
    assert _categoria(comp, "privada")["quantidade"] == 2
    assert _categoria(comp, "publica")["quantidade"] == 0


def test_nulo_e_vazio_viram_sem_informacao():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC", "SC", "SC"],
        "TP_PRESENCA_MT": [1, 1, 1, 1],
        "NU_NOTA_MT": [500.0, 500.0, 500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": ["1", "4", None, ""],
    })
    comp = calcular_composicao_escolar(df, "SC")
    assert comp["total_registros_uf"] == 4
    assert comp["total_validos"] == 2
    assert _excluido(comp, "sem_informacao")["quantidade"] == 2  # nulo + vazio


def test_codigo_desconhecido_fora_do_denominador_valido():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC"] * 4,
        "TP_PRESENCA_MT": [1, 1, 1, 1],
        "NU_NOTA_MT": [500.0, 500.0, 500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": ["1", "4", "9", "texto"],
    })
    comp = calcular_composicao_escolar(df, "SC")
    assert comp["total_validos"] == 2
    assert _excluido(comp, "codigo_nao_previsto", "9")["quantidade"] == 1
    assert _excluido(comp, "codigo_nao_previsto", "texto")["quantidade"] == 1
    # Soma de válidos + excluídos = total.
    soma = comp["total_validos"] + sum(e["quantidade"] for e in comp["excluidos"])
    assert soma == comp["total_registros_uf"]


def test_percentuais_e_cobertura_com_valores_conhecidos():
    # 3 válidos (2 pública, 1 privada) + 1 sem informação = 4 registros.
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC"] * 4,
        "TP_PRESENCA_MT": [1, 1, 1, 1],
        "NU_NOTA_MT": [500.0, 500.0, 500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": ["2", "3", "4", ""],
    })
    comp = calcular_composicao_escolar(df, "SC")
    assert comp["total_registros_uf"] == 4
    assert comp["total_validos"] == 3
    assert comp["cobertura"] == 75.0                       # 3/4
    publica = _categoria(comp, "publica")
    privada = _categoria(comp, "privada")
    assert publica["percentual_validos"] == round(2 / 3 * 100, 2)   # 66.67
    assert privada["percentual_validos"] == round(1 / 3 * 100, 2)   # 33.33
    assert publica["percentual_total"] == 50.0             # 2/4
    assert privada["percentual_total"] == 25.0             # 1/4
    soma_validos = publica["percentual_validos"] + privada["percentual_validos"]
    assert soma_validos == pytest.approx(100.0, abs=0.01)


def test_cobertura_baixa_ainda_calcula_sem_zeros_disfarcados():
    # 1 válido, 9 sem informação → cobertura 10%, mas resultado real (não zeros).
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC"] * 10,
        "TP_PRESENCA_MT": [1] * 10,
        "NU_NOTA_MT": [500.0] * 10,
        "TP_DEPENDENCIA_ADM_ESC": ["2"] + [""] * 9,
    })
    comp = calcular_composicao_escolar(df, "SC")
    assert comp["total_validos"] == 1
    assert comp["cobertura"] == 10.0
    assert _categoria(comp, "publica")["quantidade"] == 1
    assert _excluido(comp, "sem_informacao")["quantidade"] == 9


def test_composicao_normaliza_uf():
    df = pl.DataFrame({
        "SG_UF_PROVA": [" sc", "SC "],
        "TP_PRESENCA_MT": [1, 1],
        "NU_NOTA_MT": [500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": ["1", "4"],
    })
    assert calcular_composicao_escolar(df, "SC")["total_registros_uf"] == 2


def test_composicao_aceita_codigos_inteiros():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC"],
        "TP_PRESENCA_MT": [1, 1],
        "NU_NOTA_MT": [500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": [2, 4],
    })
    comp = calcular_composicao_escolar(df, "SC")
    assert comp["total_validos"] == 2
    assert _categoria(comp, "publica")["quantidade"] == 1
    assert _categoria(comp, "privada")["quantidade"] == 1


def test_composicao_sem_validos_levanta_erro_em_vez_de_zeros():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC"],
        "TP_PRESENCA_MT": [1, 1],
        "NU_NOTA_MT": [500.0, 500.0],
        "TP_DEPENDENCIA_ADM_ESC": [None, ""],
    })
    with pytest.raises(UFsemDadosError, match="pública ou privada"):
        calcular_composicao_escolar(df, "SC")


def test_composicao_uf_sem_registros():
    with pytest.raises(UFsemDadosError):
        calcular_composicao_escolar(resultados_teste(), "AM")


def test_rejeita_coluna_dependencia_ausente():
    with pytest.raises(DadosIndisponiveisError, match="TP_DEPENDENCIA_ADM_ESC"):
        calcular_composicao_escolar(pl.DataFrame({
            "SG_UF_PROVA": ["SC"], "TP_PRESENCA_MT": [1], "NU_NOTA_MT": [500.0],
        }))


def test_mapeamento_confirmado_e_fonte():
    comp = calcular_composicao_escolar(resultados_teste(), "SC")
    assert comp["mapeamento_confirmado"] is True
    assert comp["mapeamento_confirmado"] is escola.MAPEAMENTO_CONFIRMADO
    assert "TP_DEPENDENCIA_ADM_ESC" in comp["fonte_mapeamento"]


# ---------------------------------------------------------------------------
# Camada A — percentil (apenas presentes com nota válida)
# ---------------------------------------------------------------------------
def test_percentil_usa_apenas_presentes_com_nota_valida_e_trata_empates():
    r = analisar_tipo_escola("sc", 200.0, resultados=resultados_teste())
    d = r["desempenho"]
    # Presentes com nota válida em SC = [100, 200, 200, 300, 450] (o ausente com
    # 0,0 e o presente com nota nula são excluídos; a dependência vazia NÃO afeta
    # a nota). (1 abaixo + 0,5*2 empates) / 5 = 40%.
    assert d["percentil_usuario"] == 40.0
    assert d["total_notas_validas_uf"] == 5
    # Excluídos da UF SC: ausente (0,0) + presente com nota nula = 2.
    assert d["registros_sem_nota_valida_uf"] == 2
    assert r["estado_referencia"] == "SC"


def test_ausente_com_nota_zero_nao_entra_na_populacao():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC", "SC"],
        "TP_PRESENCA_MT": [1, 1, 0],      # terceiro faltou
        "NU_NOTA_MT": [700.0, 800.0, 0.0],
        "TP_DEPENDENCIA_ADM_ESC": ["2", "4", "2"],
    })
    r = analisar_tipo_escola("SC", 700.0, resultados=df)
    d = r["desempenho"]
    assert d["total_notas_validas_uf"] == 2          # só os presentes
    assert d["registros_sem_nota_valida_uf"] == 1     # o ausente (0,0)
    # 700 é a menor das duas notas válidas [700, 800]: (0 + 0,5)/2 = 25%.
    assert d["percentil_usuario"] == 25.0


# População válida de SC = [100, 200, 200, 300, 450] (5 notas).
# nota 0 → 0%; nota 1000 → 100%; nota 250 → 3 abaixo / 5 = 60%.
@pytest.mark.parametrize("nota, esperado", [(0.0, 0.0), (1000.0, 100.0), (250.0, 60.0)])
def test_percentil_limites(nota, esperado):
    r = analisar_tipo_escola("SC", nota, resultados=resultados_teste())
    assert r["desempenho"]["percentil_usuario"] == esperado


def test_notas_fora_da_escala_ou_nao_numericas_sao_excluidas():
    resultados = pl.DataFrame({
        "SG_UF_PROVA": ["SC"] * 5,
        "TP_PRESENCA_MT": [1, 1, 1, 1, 1],
        "NU_NOTA_MT": ["500", "-1", "1200", "abc", "NaN"],
        "TP_DEPENDENCIA_ADM_ESC": ["2", "2", "2", "2", "4"],
    })
    r = analisar_tipo_escola("SC", 500.0, resultados=resultados)
    assert r["desempenho"]["total_notas_validas_uf"] == 1
    assert r["desempenho"]["registros_sem_nota_valida_uf"] == 4


def test_rejeita_uf_sem_notas_validas():
    with pytest.raises(UFsemDadosError):
        analisar_tipo_escola("RJ", 500.0, resultados=resultados_teste())


@pytest.mark.parametrize("nota", [-0.01, 1000.01, math.nan, math.inf])
def test_servico_rejeita_nota_invalida_mesmo_sem_schema(nota):
    with pytest.raises(ValueError):
        analisar_tipo_escola("SC", nota, resultados=resultados_teste())


def test_analises_sao_independentes_sem_juncao():
    """Reordenar as linhas não pode alterar o resultado (sem junção por posição)."""
    base = analisar_tipo_escola("SC", 200.0, resultados_teste())
    embaralhado = analisar_tipo_escola(
        "SC", 200.0, resultados_teste().sample(fraction=1.0, shuffle=True, seed=7)
    )
    assert base == embaralhado


# ---------------------------------------------------------------------------
# Schema Pydantic (contrato de entrada inalterado)
# ---------------------------------------------------------------------------
def test_schema_normaliza_sigla_para_maiusculas():
    assert FiltroEscola(estado=" sc ", nota_matematica=720.5).estado == "SC"


def test_schema_aceita_inteiro_e_limites():
    assert FiltroEscola(estado="SP", nota_matematica=0).nota_matematica == 0
    assert FiltroEscola(estado="SP", nota_matematica=1000).nota_matematica == 1000


@pytest.mark.parametrize("payload", [
    {"estado": "XX", "nota_matematica": 500},
    {"estado": "", "nota_matematica": 500},
    {"estado": 42, "nota_matematica": 500},
    {"estado": "SC", "nota_matematica": -1},
    {"estado": "SC", "nota_matematica": 1001},
    {"estado": "SC", "nota_matematica": float("nan")},
    {"estado": "SC", "nota_matematica": float("inf")},
    {"estado": "SC", "nota_matematica": ""},
    {"estado": "SC", "nota_matematica": "720"},
    {"estado": "SC", "nota_matematica": True},
    {"estado": "SC", "nota_matematica": None},
    {"estado": "SC"},
    {"nota_matematica": 500},
    {"estado": "SC", "nota_matematica": 500, "ano": 2024},
])
def test_schema_rejeita_inputs_invalidos(payload):
    with pytest.raises(ValidationError):
        FiltroEscola(**payload)


# ---------------------------------------------------------------------------
# API ponta a ponta com Parquet sintético temporário
# ---------------------------------------------------------------------------
@pytest.fixture
def cliente_com_parquets(tmp_path, monkeypatch):
    resultados_teste().write_parquet(tmp_path / escola.NOME_RESULTADOS)
    monkeypatch.setattr(escola, "PASTA_PARQUET", tmp_path)
    return TestClient(app)


def test_api_sucesso(cliente_com_parquets):
    resp = cliente_com_parquets.post("/api/dados/escola", json={"estado": "sc", "nota_matematica": 200})
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["status"] == "success"
    assert corpo["dados"]["desempenho"]["percentil_usuario"] == 40.0
    comp = corpo["dados"]["composicao_escolar"]
    # SC deps = [1,2,3,4,2,1,""] → pública=5 (1,2,3,2,1), privada=1 (4), vazio=1.
    assert comp["total_registros_uf"] == 7
    assert comp["total_validos"] == 6
    assert comp["cobertura"] is not None
    assert comp["mapeamento_confirmado"] is True
    # A mensagem informa a cobertura observada (ex.: "cobre 85.71% dos registros").
    assert "cobre" in corpo["mensagem"].lower()


def test_api_resposta_expoe_grupos_e_codigos(cliente_com_parquets):
    resp = cliente_com_parquets.post("/api/dados/escola", json={"estado": "SC", "nota_matematica": 200})
    categorias = resp.json()["dados"]["composicao_escolar"]["categorias"]
    publica = next(c for c in categorias if c["chave"] == "publica")
    assert publica["codigos"] == [1, 2, 3]


@pytest.mark.parametrize("payload", [
    {"estado": "XX", "nota_matematica": 500},
    {"estado": "SC", "nota_matematica": "abc"},
    {"estado": "SC", "nota_matematica": 1500},
    {"estado": "SC"},
])
def test_api_422_para_payload_invalido(cliente_com_parquets, payload):
    resp = cliente_com_parquets.post("/api/dados/escola", json=payload)
    assert resp.status_code == 422


def test_api_422_para_corpo_nao_json(cliente_com_parquets):
    resp = cliente_com_parquets.post(
        "/api/dados/escola", content="nao-e-json", headers={"Content-Type": "application/json"}
    )
    assert resp.status_code == 422


def test_api_404_para_uf_sem_dados(cliente_com_parquets):
    resp = cliente_com_parquets.post("/api/dados/escola", json={"estado": "AM", "nota_matematica": 500})
    assert resp.status_code == 404
    assert "AM" in resp.json()["detail"]


def test_api_503_quando_parquet_ausente(tmp_path, monkeypatch):
    monkeypatch.setattr(escola, "PASTA_PARQUET", tmp_path)  # pasta vazia
    resp = TestClient(app).post("/api/dados/escola", json={"estado": "SC", "nota_matematica": 500})
    assert resp.status_code == 503
    assert "não encontrado" in resp.json()["detail"]


def test_api_503_quando_parquet_sem_dependencia(tmp_path, monkeypatch):
    """Cenário real: Parquet de resultados antigo (sem TP_PRESENCA_MT/dependência)."""
    pl.DataFrame({"SG_UF_PROVA": ["SC"], "NU_NOTA_MT": [500.0]}).write_parquet(
        tmp_path / escola.NOME_RESULTADOS
    )
    monkeypatch.setattr(escola, "PASTA_PARQUET", tmp_path)
    resp = TestClient(app).post("/api/dados/escola", json={"estado": "SC", "nota_matematica": 500})
    assert resp.status_code == 503
    assert "TP_DEPENDENCIA_ADM_ESC" in resp.json()["detail"]


def test_api_503_quando_parquet_corrompido(tmp_path, monkeypatch):
    (tmp_path / escola.NOME_RESULTADOS).write_bytes(b"isto nao e parquet")
    monkeypatch.setattr(escola, "PASTA_PARQUET", tmp_path)
    resp = TestClient(app).post("/api/dados/escola", json={"estado": "SC", "nota_matematica": 500})
    assert resp.status_code == 503


# ---------------------------------------------------------------------------
# ETL — projeção da dependência administrativa no Parquet de resultados
# ---------------------------------------------------------------------------
def test_etl_preserva_dependencia_como_texto(tmp_path):
    # Cabeçalho com todas as colunas que o ETL projeta de RESULTADOS, mais
    # colunas extras que devem ser descartadas pela projeção.
    csv = tmp_path / "RESULTADOS_2025.csv"
    csv.write_bytes(
        "NU_SEQUENCIAL;SG_UF_PROVA;NU_NOTA_CN;NU_NOTA_CH;NU_NOTA_LC;NU_NOTA_MT;"
        "NU_NOTA_REDACAO;TP_PRESENCA_MT;TP_DEPENDENCIA_ADM_ESC;CO_ESCOLA\n"
        "1;SC;500,0;500,0;500,0;700,0;600,0;1;2;123\n"
        "2;SC;510,0;510,0;510,0;800,0;620,0;1;4;456\n"
        "3;SP;;;;;;0;;\n".encode("latin-1")
    )
    df = ler_csv_producao(csv, COLUNAS_RESULTADOS, None, TIPOS_RESULTADOS)
    # Só as colunas projetadas entram (CO_ESCOLA e NU_SEQUENCIAL ficam de fora).
    assert set(df.columns) == set(COLUNAS_RESULTADOS)
    assert df.schema["TP_DEPENDENCIA_ADM_ESC"] == pl.String
    assert df.height == 3
    assert df.get_column("TP_DEPENDENCIA_ADM_ESC").to_list() == ["2", "4", None]
