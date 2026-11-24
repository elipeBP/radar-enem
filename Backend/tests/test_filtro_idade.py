"""Testes do Filtro 5 — Faixa Etária (issue #52).

Modelagem (confirmada no dicionário oficial 2024, ver docs/dicionario_dados.md):
a composição por faixa etária usa TP_FAIXA_ETARIA da base de PARTICIPANTES
(20 códigos oficiais, 1="Menor de 17 anos" ... 20="Maior de 70 anos"), e o
percentil/Z-Score usa NU_NOTA_MT da base de RESULTADOS. Não há junção entre
as duas bases -- mesma arquitetura da Trilha de Gênero (core/genero.py).

TODOS os dados aqui são SINTÉTICOS, criados apenas para verificar regras de
cálculo e validação. Não representam resultados do ENEM.

Rodar em Backend/: pytest tests/test_filtro_idade.py -v
"""

import math

import polars as pl
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import core.faixa_etaria as faixa_etaria
from api.main import app
from api.schemas import FiltroIdade
from core.faixa_etaria import (
    DadosIndisponiveisError,
    UFsemDadosError,
    analisar_faixa_etaria,
    calcular_composicao_etaria,
)


# ---------------------------------------------------------------------------
# Dados sintéticos
# ---------------------------------------------------------------------------
def resultados_teste() -> pl.DataFrame:
    # SC: notas válidas 100, 200, 200, 300, 450; 1 nula (excluída).
    # SP: 2 notas altas.
    return pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC", "SC", "SC", "SC", "SC", "SP", "SP"],
        "NU_NOTA_MT": [100.0, 200.0, 200.0, 300.0, None, 450.0, 950.0, 990.0],
    })


def participantes_teste() -> pl.DataFrame:
    # SC: codigos 1,1,2,3,vazio,"99"(nao previsto, fora de 1-20). SP: codigo 5.
    return pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC", "SC", "SC", "SC", "SC", "SP"],
        "TP_FAIXA_ETARIA": ["1", "1", "2", "3", "", "99", "5"],
    })


def _categoria(composicao, codigo):
    return next(c for c in composicao["categorias"] if c["codigo"] == codigo)


def _excluido(composicao, chave, codigo=None):
    return next(
        e for e in composicao["excluidos"]
        if e["chave"] == chave and (codigo is None or e["codigo"] == codigo)
    )


# ---------------------------------------------------------------------------
# Camada 2 — composição por faixa etária
# ---------------------------------------------------------------------------
def test_todas_as_20_faixas_aparecem_mesmo_com_quantidade_zero():
    comp = calcular_composicao_etaria(participantes_teste(), "SC")
    assert len(comp["categorias"]) == 20
    assert _categoria(comp, 1)["quantidade"] == 2
    assert _categoria(comp, 2)["quantidade"] == 1
    assert _categoria(comp, 3)["quantidade"] == 1
    assert _categoria(comp, 20)["quantidade"] == 0


def test_rotulos_batem_com_o_dicionario_oficial():
    comp = calcular_composicao_etaria(participantes_teste(), "SC")
    assert _categoria(comp, 1)["rotulo"] == "Menor de 17 anos"
    assert _categoria(comp, 20)["rotulo"] == "Maior de 70 anos"
    assert _categoria(comp, 11)["rotulo"] == "Entre 26 e 30 anos"


def test_vazio_vira_sem_informacao():
    comp = calcular_composicao_etaria(participantes_teste(), "SC")
    assert _excluido(comp, "sem_informacao")["quantidade"] == 1


def test_codigo_desconhecido_fora_do_denominador_valido():
    comp = calcular_composicao_etaria(participantes_teste(), "SC")
    assert _excluido(comp, "codigo_nao_previsto", "99")["quantidade"] == 1
    soma = comp["total_validos"] + sum(e["quantidade"] for e in comp["excluidos"])
    assert soma == comp["total_inscritos"]


def test_percentuais_com_valores_conhecidos():
    # SC válidos: 1,1,2,3 (4 válidos) + "" + "9" = 6 inscritos totais.
    comp = calcular_composicao_etaria(participantes_teste(), "SC")
    assert comp["total_inscritos"] == 6
    assert comp["total_validos"] == 4
    assert _categoria(comp, 1)["percentual_validos"] == 50.0   # 2/4
    assert _categoria(comp, 1)["percentual_total"] == pytest.approx(33.33, abs=0.01)  # 2/6


def test_composicao_normaliza_uf():
    df = pl.DataFrame({
        "SG_UF_PROVA": [" sc", "SC "],
        "TP_FAIXA_ETARIA": ["1", "2"],
    })
    assert calcular_composicao_etaria(df, "SC")["total_inscritos"] == 2


def test_composicao_aceita_codigos_inteiros():
    df = pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC"],
        "TP_FAIXA_ETARIA": [1, 2],
    })
    comp = calcular_composicao_etaria(df, "SC")
    assert comp["total_validos"] == 2
    assert _categoria(comp, 1)["quantidade"] == 1
    assert _categoria(comp, 2)["quantidade"] == 1


def test_composicao_sem_validos_levanta_erro_em_vez_de_zeros():
    df = pl.DataFrame({"SG_UF_PROVA": ["SC", "SC"], "TP_FAIXA_ETARIA": [None, ""]})
    with pytest.raises(UFsemDadosError, match="20 códigos oficiais"):
        calcular_composicao_etaria(df, "SC")


def test_composicao_uf_sem_registros():
    with pytest.raises(UFsemDadosError):
        calcular_composicao_etaria(participantes_teste(), "AM")


def test_rejeita_coluna_faixa_etaria_ausente():
    with pytest.raises(DadosIndisponiveisError, match="TP_FAIXA_ETARIA"):
        calcular_composicao_etaria(pl.DataFrame({"SG_UF_PROVA": ["SC"]}), "SC")


# ---------------------------------------------------------------------------
# Camada 1 — percentil/Z-Score (nota x UF)
# ---------------------------------------------------------------------------
def test_percentil_e_zscore_com_empates():
    r = analisar_faixa_etaria(
        "SC", 200.0, resultados=resultados_teste(), participantes=participantes_teste()
    )
    d = r["desempenho"]
    # Válidas em SC: [100, 200, 200, 300, 450] (a nula é excluída).
    # (1 abaixo + 0,5*2 empates)/5 = 40%.
    assert d["percentil_usuario"] == 40.0
    assert d["total_notas_validas_uf"] == 5
    assert d["zscore_usuario"] is not None
    assert r["estado_referencia"] == "SC"


def test_nota_nula_nao_entra_na_populacao():
    r = analisar_faixa_etaria(
        "SC", 450.0, resultados=resultados_teste(), participantes=participantes_teste()
    )
    assert r["desempenho"]["total_notas_validas_uf"] == 5


def test_zscore_indisponivel_quando_sem_dispersao():
    df = pl.DataFrame({"SG_UF_PROVA": ["RJ", "RJ"], "NU_NOTA_MT": [500.0, 500.0]})
    r = analisar_faixa_etaria(
        "RJ", 500.0, resultados=df,
        participantes=pl.DataFrame({"SG_UF_PROVA": ["RJ"], "TP_FAIXA_ETARIA": ["1"]}),
    )
    assert r["desempenho"]["zscore_usuario"] is None
    assert r["desempenho"]["observacao_zscore"] is not None


def test_rejeita_uf_sem_notas_validas():
    df = pl.DataFrame({"SG_UF_PROVA": ["RJ"], "NU_NOTA_MT": [None]})
    with pytest.raises(UFsemDadosError):
        analisar_faixa_etaria(
            "RJ", 500.0, resultados=df,
            participantes=pl.DataFrame({"SG_UF_PROVA": ["RJ"], "TP_FAIXA_ETARIA": ["1"]}),
        )


@pytest.mark.parametrize("nota", [-0.01, 1000.01, math.nan, math.inf])
def test_servico_rejeita_nota_invalida_mesmo_sem_schema(nota):
    with pytest.raises(ValueError):
        analisar_faixa_etaria(
            "SC", nota, resultados=resultados_teste(), participantes=participantes_teste()
        )


def test_servico_rejeita_uf_invalida():
    with pytest.raises(ValueError):
        analisar_faixa_etaria(
            "XX", 500.0, resultados=resultados_teste(), participantes=participantes_teste()
        )


def test_analises_sao_independentes_sem_juncao():
    """Reordenar as linhas não pode alterar o resultado (sem junção por posição)."""
    base = analisar_faixa_etaria(
        "SC", 200.0, resultados=resultados_teste(), participantes=participantes_teste()
    )
    embaralhado = analisar_faixa_etaria(
        "SC", 200.0,
        resultados=resultados_teste().sample(fraction=1.0, shuffle=True, seed=7),
        participantes=participantes_teste().sample(fraction=1.0, shuffle=True, seed=3),
    )
    assert base == embaralhado


# ---------------------------------------------------------------------------
# Schema Pydantic (mesmo contrato do Filtro 4)
# ---------------------------------------------------------------------------
def test_schema_normaliza_sigla_para_maiusculas():
    assert FiltroIdade(estado=" sc ", nota_matematica=720.5).estado == "SC"


def test_schema_aceita_inteiro_e_limites():
    assert FiltroIdade(estado="SP", nota_matematica=0).nota_matematica == 0
    assert FiltroIdade(estado="SP", nota_matematica=1000).nota_matematica == 1000


@pytest.mark.parametrize("payload", [
    {"estado": "XX", "nota_matematica": 500},
    {"estado": "", "nota_matematica": 500},
    {"estado": 42, "nota_matematica": 500},
    {"estado": "SC", "nota_matematica": -1},
    {"estado": "SC", "nota_matematica": 1001},
    {"estado": "SC", "nota_matematica": float("nan")},
    {"estado": "SC", "nota_matematica": float("inf")},
    {"estado": "SC", "nota_matematica": "720"},
    {"estado": "SC", "nota_matematica": True},
    {"estado": "SC", "nota_matematica": None},
    {"estado": "SC"},
    {"nota_matematica": 500},
    {"estado": "SC", "nota_matematica": 500, "ano": 2024},
])
def test_schema_rejeita_inputs_invalidos(payload):
    with pytest.raises(ValidationError):
        FiltroIdade(**payload)


# ---------------------------------------------------------------------------
# API ponta a ponta com Parquets sintéticos temporários
# ---------------------------------------------------------------------------
@pytest.fixture
def cliente_com_parquets(tmp_path, monkeypatch):
    resultados_teste().write_parquet(tmp_path / faixa_etaria.NOME_RESULTADOS)
    participantes_teste().write_parquet(tmp_path / faixa_etaria.NOME_PARTICIPANTES)
    monkeypatch.setattr(faixa_etaria, "PASTA_PARQUET", tmp_path)
    return TestClient(app)


def test_api_sucesso(cliente_com_parquets):
    resp = cliente_com_parquets.post("/api/dados/idade", json={"estado": "sc", "nota_matematica": 200})
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["status"] == "success"
    assert corpo["dados"]["desempenho"]["percentil_usuario"] == 40.0
    comp = corpo["dados"]["composicao_etaria"]
    assert comp["total_inscritos"] == 6
    assert comp["total_validos"] == 4
    assert len(comp["categorias"]) == 20


def test_api_422_para_payload_invalido(cliente_com_parquets):
    resp = cliente_com_parquets.post(
        "/api/dados/idade", json={"estado": "XX", "nota_matematica": 500}
    )
    assert resp.status_code == 422


def test_api_404_para_uf_sem_dados(cliente_com_parquets):
    resp = cliente_com_parquets.post("/api/dados/idade", json={"estado": "AM", "nota_matematica": 500})
    assert resp.status_code == 404
    assert "AM" in resp.json()["detail"]


def test_api_503_quando_parquet_ausente(tmp_path, monkeypatch):
    monkeypatch.setattr(faixa_etaria, "PASTA_PARQUET", tmp_path)  # pasta vazia
    resp = TestClient(app).post("/api/dados/idade", json={"estado": "SC", "nota_matematica": 500})
    assert resp.status_code == 503
    assert "não encontrado" in resp.json()["detail"]


def test_api_503_quando_parquet_sem_faixa_etaria(tmp_path, monkeypatch):
    resultados_teste().write_parquet(tmp_path / faixa_etaria.NOME_RESULTADOS)
    pl.DataFrame({"SG_UF_PROVA": ["SC"]}).write_parquet(tmp_path / faixa_etaria.NOME_PARTICIPANTES)
    monkeypatch.setattr(faixa_etaria, "PASTA_PARQUET", tmp_path)
    resp = TestClient(app).post("/api/dados/idade", json={"estado": "SC", "nota_matematica": 500})
    assert resp.status_code == 503
    assert "TP_FAIXA_ETARIA" in resp.json()["detail"]
