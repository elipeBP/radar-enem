"""
core/estatistica.py
--------------------
Motor estatístico compartilhado por todos os módulos de análise (#35).

Toda rota de módulo (ex: /api/dados/genero) filtra o DataFrame pelos
critérios recebidos do usuário (UF, faixa etc.) e chama as duas funções
abaixo pra descobrir onde o valor do usuário se posiciona dentro daquela
fatia da população.
"""

import polars as pl


def calcular_percentil(valor_usuario: float, serie: pl.Series) -> float:
    """
    Retorna o percentil (0-100) de `valor_usuario` dentro de `serie`.

    Ex: se 82% dos valores de `serie` são menores ou iguais a
    `valor_usuario`, o retorno deve ser 82.0.

    Fórmula usada (percentile rank com tratamento de empates):

        percentil = (qtd_abaixo + 0.5 * qtd_igual) / tamanho_serie * 100

    Por que essa fórmula e não "rank simples / tamanho * 100": ela trata
    empates de forma justa -- um valor empatado com várias pessoas fica
    no "meio" delas, em vez de ser arbitrariamente colocado acima ou
    abaixo de todo mundo com quem empatou. Como efeito colateral (e
    desejado): quando `valor_usuario` é estritamente menor ou maior que
    toda a série, o resultado é exatamente 0.0 ou 100.0; quando há
    empate na borda, o resultado fica perto de 0/100 mas não exatamente
    neles -- o que é o comportamento estatisticamente correto.

    Levanta ValueError se `serie` estiver vazia -- não existe "percentil
    de uma população vazia", e devolver um número arbitrário (tipo 0.0
    ou 50.0) esconderia silenciosamente um bug de filtro upstream (ex:
    um filtro de UF que não bateu com nenhum registro).
    """
    tamanho = serie.len()
    if tamanho == 0:
        raise ValueError(
            "Não é possível calcular percentil: a série está vazia "
            "(filtro populacional não retornou nenhum registro)."
        )

    qtd_abaixo = (serie < valor_usuario).sum()
    qtd_igual = (serie == valor_usuario).sum()

    percentil = (qtd_abaixo + 0.5 * qtd_igual) / tamanho * 100
    return float(percentil)


def calcular_zscore(valor_usuario: float, serie: pl.Series) -> float:
    """
    Retorna o Z-Score de `valor_usuario` em relação à média/desvio-padrão
    de `serie`: (valor_usuario - média) / desvio_padrão.

    Usamos desvio-padrão POPULACIONAL (ddof=0), não amostral (ddof=1):
    `serie` aqui representa o censo completo dos participantes do
    recorte filtrado (ex: "todas as mulheres inscritas em SC"), não uma
    amostra de uma população maior -- então o cálculo populacional é o
    estatisticamente correto.

    Levanta ValueError em dois casos, pelo mesmo motivo do percentil
    (falhar alto é melhor que devolver um número que parece válido mas
    não significa nada):
    - `serie` vazia: não existe média/desvio de população vazia.
    - desvio-padrão igual a 0: todos os valores de `serie` são iguais
      entre si -- isso inclui o caso de `serie` ter só 1 elemento
      (desvio de uma série de 1 elemento é sempre 0). Não é apenas um
      erro técnico de divisão por zero: é um sinal de que o recorte
      filtrado é homogêneo (ou pequeno) demais pra fazer sentido
      estatístico de dispersão.
    """
    if serie.len() == 0:
        raise ValueError(
            "Não é possível calcular Z-Score: a série está vazia "
            "(filtro populacional não retornou nenhum registro)."
        )

    media = serie.mean()
    desvio_padrao = serie.std(ddof=0)

    if desvio_padrao == 0:
        raise ValueError(
            "Não é possível calcular Z-Score: desvio-padrão é zero "
            "(todos os valores da série filtrada são iguais, ou a "
            "série tem apenas 1 elemento)."
        )

    return float((valor_usuario - media) / desvio_padrao)