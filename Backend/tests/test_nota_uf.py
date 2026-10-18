import polars as pl
import pytest

from core.nota_uf import (
    DadosIndisponiveisError,
    UFsemDadosError,
    analisar_nota_uf,
)


@pytest.fixture
def resultados_teste() -> pl.DataFrame:
    return pl.DataFrame({
        "SG_UF_PROVA": ["SC", "SC", "SC", "SC", "RJ", "RJ"],
        "NU_NOTA_CN": [100.0, 200.0, 300.0, 400.0, 500.0, 600.0],
        "NU_NOTA_CH": [150.0, 250.0, 350.0, 450.0, 550.0, 650.0],
        "NU_NOTA_LC": [120.0, 220.0, 320.0, 420.0, 520.0, 620.0],
        "NU_NOTA_MT": [180.0, 280.0, 380.0, 480.0, 580.0, 680.0],
        "NU_NOTA_REDACAO": [200.0, 400.0, 600.0, 800.0, 600.0, 800.0],
    })


def test_calcula_percentil_media_e_zscore(resultados_teste):
    resposta = analisar_nota_uf("sc", "CN", 300, resultados_teste)
    assert resposta["estado_referencia"] == "SC"
    assert resposta["area"] == "CN"
    assert resposta["area_descricao"] == "Ciências da Natureza"
    assert resposta["percentil_usuario"] == 62.5
    assert resposta["media_uf"] == 250.0
    assert resposta["total_notas_validas"] == 4
    assert resposta["zscore_usuario"] is not None
    assert resposta["zscore_usuario"] > 0


@pytest.mark.parametrize(
    ("area", "coluna"),
    [
        ("CN", "NU_NOTA_CN"),
        ("CH", "NU_NOTA_CH"),
        ("LC", "NU_NOTA_LC"),
        ("MT", "NU_NOTA_MT"),
        ("REDACAO", "NU_NOTA_REDACAO"),
    ],
)
def test_suporta_as_cinco_areas(resultados_teste, area, coluna):
    resposta = analisar_nota_uf("SC", area, 500, resultados_teste)
    assert resposta["coluna_nota"] == coluna
    assert resposta["total_notas_validas"] == 4


def test_ignora_notas_nulas_nao_finitas_e_fora_da_escala(resultados_teste):
    dados = resultados_teste.with_columns(
        pl.Series("NU_NOTA_MT", [None, float("nan"), 1100.0, 480.0, 580.0, 680.0])
    )
    resposta = analisar_nota_uf("SC", "MT", 500, dados)
    assert resposta["total_notas_validas"] == 1
    assert resposta["media_uf"] == 480.0
    assert resposta["zscore_usuario"] is None
    assert resposta["observacao_zscore"] is not None


def test_rejeita_uf_invalida(resultados_teste):
    with pytest.raises(ValueError, match="UF"):
        analisar_nota_uf("XX", "MT", 700, resultados_teste)


def test_rejeita_area_invalida(resultados_teste):
    with pytest.raises(ValueError, match="área"):
        analisar_nota_uf("SC", "BIOLOGIA", 700, resultados_teste)


@pytest.mark.parametrize("nota", [-1, 1001, float("nan"), float("inf"), True])
def test_rejeita_nota_fora_da_escala(resultados_teste, nota):
    with pytest.raises(ValueError, match="nota"):
        analisar_nota_uf("SC", "MT", nota, resultados_teste)


def test_uf_sem_notas_validas_gera_erro(resultados_teste):
    with pytest.raises(UFsemDadosError):
        analisar_nota_uf("AC", "MT", 700, resultados_teste)


def test_arquivo_parquet_ausente_gera_erro(monkeypatch, tmp_path):
    monkeypatch.setenv("RESULTADOS_PARQUET_PATH", str(tmp_path / "ausente.parquet"))
    with pytest.raises(DadosIndisponiveisError, match="não foi encontrado"):
        analisar_nota_uf("SC", "MT", 700)


def test_percentil_permanece_disponivel_com_notas_iguais(resultados_teste):
    dados = resultados_teste.with_columns(
        pl.Series("NU_NOTA_LC", [300.0, 300.0, 300.0, 300.0, 500.0, 600.0])
    )
    resposta = analisar_nota_uf("SC", "LC", 300, dados)
    assert resposta["percentil_usuario"] == 50.0
    assert resposta["zscore_usuario"] is None


def test_schema_incompleto_gera_erro():
    dados = pl.DataFrame({"SG_UF_PROVA": ["SC"], "NU_NOTA_MT": [600.0]})
    with pytest.raises(DadosIndisponiveisError, match="colunas"):
        analisar_nota_uf("SC", "MT", 700, dados)
