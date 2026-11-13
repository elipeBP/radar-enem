"""
tests/test_genero_rota.py
--------------------------
Testes da rota POST /api/dados/genero (#37), de ponta a ponta: a API sobe
de verdade (com o lifespan do #36), mas lendo Parquets pequenos criados em
pasta temporária -- nunca os arquivos reais de 4,8 milhões de linhas.

Rodar com:  pytest tests/test_genero_rota.py -v
"""

import polars as pl
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Mesmos dados dos testes unitários: SC tem notas 500/600/700/800.
    pl.DataFrame(
        {
            "SG_UF_PROVA": ["SC"] * 5 + ["SP"] * 2,
            "NU_NOTA_CN": [510.0, 610.0, 710.0, 810.0, None, 410.0, 910.0],
            "NU_NOTA_MT": [500.0, 600.0, 700.0, 800.0, None, 400.0, 900.0],
        }
    ).write_parquet(tmp_path / "resultados_2025.parquet")

    pl.DataFrame(
        {
            "SG_UF_PROVA": ["SC"] * 5 + ["SP"] * 4,
            "TP_SEXO": ["F", "F", "M", "F", None, "M", "M", "F", "M"],
        }
    ).write_parquet(tmp_path / "participantes_2025.parquet")

    # O lifespan (#36) lê estes caminhos na hora em que a API sobe.
    monkeypatch.setenv("RESULTADOS_PARQUET_PATH", str(tmp_path / "resultados_2025.parquet"))
    monkeypatch.setenv("PARTICIPANTES_PARQUET_PATH", str(tmp_path / "participantes_2025.parquet"))

    from api.main import app

    with TestClient(app) as c:
        yield c


def _post(client, **corpo):
    payload = {"ano": 2025, "estados": ["SC"], "nota_matematica": 700}
    payload.update(corpo)
    return client.post("/api/dados/genero", json=payload)


def test_rota_devolve_dados_reais_das_duas_fontes(client):
    resp = _post(client)
    assert resp.status_code == 200

    corpo = resp.json()
    assert corpo["status"] == "success"

    dados = corpo["dados"]
    assert dados["ano_referencia"] == 2025
    assert dados["estados_referencia"] == ["SC"]
    assert dados["nota_por_uf"]["percentil_usuario"] == pytest.approx(62.5)
    assert dados["nota_por_uf"]["media_grupo_filtrado"] == pytest.approx(650.0)
    assert dados["composicao_demografica"]["percentual_mulheres"] == pytest.approx(75.0)
    assert dados["nota_por_uf"]["fonte"] != dados["composicao_demografica"]["fonte"]
    assert dados["aviso"]


def test_rota_mantem_atalhos_de_compatibilidade_com_o_frontend(client):
    dados = _post(client).json()["dados"]
    assert dados["percentil_usuario"] == pytest.approx(62.5)
    assert dados["media_grupo_filtrado"] == pytest.approx(650.0)


def test_rota_aceita_varios_estados(client):
    dados = _post(client, estados=["SC", "SP"]).json()["dados"]
    assert dados["estados_referencia"] == ["SC", "SP"]
    assert dados["nota_por_uf"]["total_participantes_com_nota"] == 6
    assert dados["composicao_demografica"]["percentual_mulheres"] == pytest.approx(50.0)


def test_rota_aceita_sigla_em_minuscula(client):
    resp = _post(client, estados=["sc"])
    assert resp.status_code == 200
    assert resp.json()["dados"]["estados_referencia"] == ["SC"]


def test_rota_rejeita_sigla_inexistente(client):
    assert _post(client, estados=["XX"]).status_code == 422


def test_rota_rejeita_lista_de_estados_vazia(client):
    assert _post(client, estados=[]).status_code == 422


def test_rota_rejeita_contrato_antigo_com_estado_unico(client):
    resp = client.post(
        "/api/dados/genero",
        json={"ano": 2025, "estado": "SC", "nota_matematica": 700},
    )
    assert resp.status_code == 422


def test_rota_rejeita_nota_fora_do_intervalo(client):
    assert _post(client, nota_matematica=9999).status_code == 422


def test_rota_explica_quando_o_ano_nao_tem_dados(client):
    resp = _post(client, ano=2024)
    assert resp.status_code == 422
    assert "2025" in resp.json()["detail"]


def test_rota_devolve_404_para_estado_sem_registros(client):
    # AC é uma UF válida, mas não existe nos dados de teste
    resp = _post(client, estados=["AC"])
    assert resp.status_code == 404


def test_rota_devolve_503_se_os_dados_nao_foram_carregados():
    from api.main import app

    # remove o que testes anteriores possam ter deixado em app.state e usa o
    # cliente SEM 'with', o que não dispara o lifespan
    for nome in ("df_resultados", "df_participantes"):
        if hasattr(app.state, nome):
            delattr(app.state, nome)

    resp = TestClient(app).post(
        "/api/dados/genero",
        json={"ano": 2025, "estados": ["SC"], "nota_matematica": 700},
    )
    assert resp.status_code == 503