"""
tests/test_genero.py
---------------------
Testes unitários do módulo Trilha de Gênero (#37): regra de negócio
(core/genero.py) e contratos (api/schemas.py). Não sobem a API e não leem
Parquet: usam DataFrames pequenos montados aqui, com valores calculados à
mão, pra que o teste não dependa do código que ele está testando.

Rodar com:  pytest tests/test_genero.py -v
"""

import polars as pl
import pytest
from pydantic import ValidationError

from core.genero import (
    ANO_DADOS,
    AnoIndisponivelError,
    EstadosSemDadosError,
    analisar_genero,
)

try:
    from schemas import FiltroGenero
except ImportError:
    from api.schemas import FiltroGenero


# SC tem 4 notas válidas (500, 600, 700, 800) e 1 ausente (None).
# SP tem 2 notas (400, 900). RJ tem todas as notas iguais (sem dispersão).
@pytest.fixture
def df_resultados():
    return pl.DataFrame(
        {
            "SG_UF_PROVA": ["SC"] * 5 + ["SP"] * 2 + ["RJ"] * 3,
            "NU_NOTA_MT": [500.0, 600.0, 700.0, 800.0, None, 400.0, 900.0, 500.0, 500.0, 500.0],
        }
    )


# SC: 3 F + 1 M (+ 1 sem sexo informado). SP: 1 F + 3 M. RJ: 2 F.
@pytest.fixture
def df_participantes():
    return pl.DataFrame(
        {
            "SG_UF_PROVA": ["SC"] * 5 + ["SP"] * 4 + ["RJ"] * 2,
            "TP_SEXO": ["F", "F", "M", "F", None, "M", "M", "F", "M", "F", "F"],
        }
    )


def _rodar(df_res, df_part, *, estados, nota, ano=ANO_DADOS):
    return analisar_genero(df_res, df_part, ano=ano, estados=estados, nota_usuario=nota)


# --- Bloco 1: nota x UF -----------------------------------------------------

def test_percentil_e_media_de_uma_uf(df_resultados, df_participantes):
    # SC válidas: 500, 600, 700, 800 -> abaixo de 700: 2; iguais: 1
    # percentil = (2 + 0.5) / 4 * 100 = 62.5 ; média = 650
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    assert r["nota_por_uf"]["percentil_usuario"] == pytest.approx(62.5)
    assert r["nota_por_uf"]["media_grupo_filtrado"] == pytest.approx(650.0)


def test_zscore_de_uma_uf(df_resultados, df_participantes):
    # desvio-padrão populacional de [500,600,700,800] = sqrt(12500) ≈ 111.803
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    assert r["nota_por_uf"]["zscore_usuario"] == pytest.approx(50 / 111.803, abs=1e-3)


def test_nota_igual_a_media_da_zscore_zero(df_resultados, df_participantes):
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=650.0)
    assert r["nota_por_uf"]["zscore_usuario"] == pytest.approx(0.0)
    assert r["nota_por_uf"]["percentil_usuario"] == pytest.approx(50.0)


def test_nota_ausente_nao_entra_na_populacao(df_resultados, df_participantes):
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    assert r["nota_por_uf"]["total_participantes_com_nota"] == 4  # e não 5


def test_varios_estados_formam_um_unico_grupo(df_resultados, df_participantes):
    # SC + SP: [500,600,700,800,400,900] -> média 650
    # abaixo de 700: 500, 600, 400 = 3 ; iguais: 1 -> (3 + 0.5) / 6 * 100
    r = _rodar(df_resultados, df_participantes, estados=["SC", "SP"], nota=700.0)
    assert r["nota_por_uf"]["total_participantes_com_nota"] == 6
    assert r["nota_por_uf"]["media_grupo_filtrado"] == pytest.approx(650.0)
    assert r["nota_por_uf"]["percentil_usuario"] == pytest.approx(58.33, abs=0.01)


def test_nota_maior_gera_percentil_maior(df_resultados, df_participantes):
    baixo = _rodar(df_resultados, df_participantes, estados=["SC"], nota=550.0)
    alto = _rodar(df_resultados, df_participantes, estados=["SC"], nota=750.0)
    assert alto["nota_por_uf"]["percentil_usuario"] > baixo["nota_por_uf"]["percentil_usuario"]


# --- Bloco 2: composição demográfica -----------------------------------------

def test_percentual_de_mulheres_de_uma_uf(df_resultados, df_participantes):
    # SC com sexo informado: F, F, M, F -> 3 de 4 = 75%
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    comp = r["composicao_demografica"]
    assert comp["percentual_mulheres"] == pytest.approx(75.0)
    assert comp["percentual_homens"] == pytest.approx(25.0)
    assert comp["inscritas_mulheres"] == 3
    assert comp["inscritos_homens"] == 1


def test_sexo_nao_informado_fica_fora_do_denominador(df_resultados, df_participantes):
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    assert r["composicao_demografica"]["total_inscritos"] == 4  # e não 5


def test_composicao_de_varios_estados(df_resultados, df_participantes):
    # SC (3F,1M) + SP (1F,3M) = 4F e 4M de 8 -> 50%
    r = _rodar(df_resultados, df_participantes, estados=["SC", "SP"], nota=700.0)
    assert r["composicao_demografica"]["total_inscritos"] == 8
    assert r["composicao_demografica"]["percentual_mulheres"] == pytest.approx(50.0)


# --- As duas fontes não se misturam ------------------------------------------

def test_blocos_separados_e_aviso_presente(df_resultados, df_participantes):
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    nota, comp = r["nota_por_uf"], r["composicao_demografica"]

    assert nota["fonte"] == "RESULTADOS_2025"
    assert comp["fonte"] == "PARTICIPANTES_2025"
    # nenhum campo de nota dentro da composição, nenhum de sexo dentro da nota
    assert not any("nota" in chave or "percentil" in chave for chave in comp)
    assert not any("mulher" in chave or "homem" in chave for chave in nota)
    assert "não" in r["aviso"].lower() and "cruzad" in r["aviso"].lower()


def test_atalhos_de_compatibilidade_batem_com_o_bloco_nota(df_resultados, df_participantes):
    r = _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0)
    assert r["percentil_usuario"] == r["nota_por_uf"]["percentil_usuario"]
    assert r["media_grupo_filtrado"] == r["nota_por_uf"]["media_grupo_filtrado"]


# --- Erros -------------------------------------------------------------------

def test_ano_sem_dados_levanta_erro(df_resultados, df_participantes):
    with pytest.raises(AnoIndisponivelError):
        _rodar(df_resultados, df_participantes, estados=["SC"], nota=700.0, ano=2024)


def test_estado_sem_registros_levanta_erro(df_resultados, df_participantes):
    with pytest.raises(EstadosSemDadosError):
        _rodar(df_resultados, df_participantes, estados=["AC"], nota=700.0)


def test_grupo_sem_dispersao_levanta_erro(df_resultados, df_participantes):
    # RJ: todas as notas são 500 -> desvio-padrão 0 -> Z-Score indefinido
    with pytest.raises(EstadosSemDadosError):
        _rodar(df_resultados, df_participantes, estados=["RJ"], nota=500.0)


# --- Contrato de entrada (schemas.py) -----------------------------------------

def test_filtro_aceita_lista_de_estados():
    f = FiltroGenero(ano=2025, estados=["SC", "SP"], nota_matematica=700)
    assert f.estados == ["SC", "SP"]


def test_filtro_normaliza_minusculas_espacos_e_repetidas():
    f = FiltroGenero(ano=2025, estados=[" sc ", "SP", "sc"], nota_matematica=700)
    assert f.estados == ["SC", "SP"]


def test_filtro_rejeita_sigla_inexistente():
    with pytest.raises(ValidationError):
        FiltroGenero(ano=2025, estados=["XX"], nota_matematica=700)


def test_filtro_rejeita_lista_vazia():
    with pytest.raises(ValidationError):
        FiltroGenero(ano=2025, estados=[], nota_matematica=700)


def test_filtro_rejeita_contrato_antigo_com_estado_unico():
    with pytest.raises(ValidationError):
        FiltroGenero(ano=2025, estado="SC", nota_matematica=700)


@pytest.mark.parametrize("nota", [-1, 1000.5, 9999])
def test_filtro_rejeita_nota_fora_do_intervalo(nota):
    with pytest.raises(ValidationError):
        FiltroGenero(ano=2025, estados=["SC"], nota_matematica=nota)