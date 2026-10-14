"""
tests/test_estatistica.py
--------------------------
Testes automatizados do motor estatístico (#35). Rodar com:

    pytest tests/test_estatistica.py -v
"""

import polars as pl
import pytest

from core.estatistica import calcular_percentil, calcular_zscore


# --- calcular_percentil ---------------------------------------------------

def test_percentil_valor_no_meio_da_serie():
    """Série 1..100, valor 50 -> deve dar algo perto de 50."""
    serie = pl.Series(list(range(1, 101)))
    resultado = calcular_percentil(50, serie)
    assert 45 <= resultado <= 55


def test_percentil_valor_menor_que_tudo():
    """Valor abaixo do mínimo da série -> próximo de 0."""
    serie = pl.Series(list(range(1, 101)))
    resultado = calcular_percentil(0, serie)
    assert resultado == pytest.approx(0.0)


def test_percentil_valor_maior_que_tudo():
    """Valor acima do máximo da série -> próximo de 100."""
    serie = pl.Series(list(range(1, 101)))
    resultado = calcular_percentil(200, serie)
    assert resultado == pytest.approx(100.0)


def test_percentil_serie_vazia_levanta_excecao():
    """Série vazia deve levantar exceção, não devolver um número em silêncio."""
    with pytest.raises(ValueError):
        calcular_percentil(50, pl.Series([], dtype=pl.Float64))


def test_percentil_serie_com_um_elemento():
    """Caso de borda citado no ticket: série com 1 elemento só."""
    serie = pl.Series([50.0])
    resultado = calcular_percentil(50.0, serie)
    assert resultado == pytest.approx(50.0)


def test_percentil_trata_empates_sem_estourar_limites():
    """Valor empatado com vários elementos não deve passar de 100 nem ficar abaixo de 0."""
    serie = pl.Series([10, 10, 10, 10, 10])
    resultado = calcular_percentil(10, serie)
    assert 0.0 <= resultado <= 100.0


# --- calcular_zscore -------------------------------------------------------

def test_zscore_valor_igual_a_media():
    """Valor igual à média da série -> 0.0."""
    serie = pl.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    media = serie.mean()
    resultado = calcular_zscore(media, serie)
    assert resultado == pytest.approx(0.0, abs=1e-9)


def test_zscore_valor_acima_da_media_e_positivo():
    serie = pl.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    resultado = calcular_zscore(100.0, serie)
    assert resultado > 0


def test_zscore_valor_abaixo_da_media_e_negativo():
    serie = pl.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    resultado = calcular_zscore(0.0, serie)
    assert resultado < 0


def test_zscore_serie_vazia_levanta_excecao():
    with pytest.raises(ValueError):
        calcular_zscore(50, pl.Series([], dtype=pl.Float64))


def test_zscore_desvio_padrao_zero_levanta_excecao():
    """Todos os valores iguais -> desvio padrão 0 -> deve levantar exceção, não dividir por zero."""
    serie = pl.Series([42.0, 42.0, 42.0])
    with pytest.raises(ValueError):
        calcular_zscore(42.0, serie)


def test_zscore_serie_com_um_elemento_levanta_excecao():
    """Caso de borda citado no ticket: série com 1 elemento -> desvio padrão sempre 0."""
    serie = pl.Series([50.0])
    with pytest.raises(ValueError):
        calcular_zscore(50.0, serie)