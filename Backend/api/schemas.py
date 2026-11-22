"""
schemas.py
----------
Contratos de dados (modelos Pydantic) usados pelas rotas da API.

Por que separar isso do main.py?
- O Pydantic valida automaticamente os dados que chegam nas requisições
  (tipo, formato, obrigatoriedade) antes de qualquer linha da sua lógica rodar.
- Mantendo os "contratos" isolados aqui, qualquer pessoa da squad consegue
  entender o que a API espera receber/devolver sem precisar ler a lógica das rotas.
- Facilita testes unitários dos modelos isoladamente.
"""

import math

from pydantic import BaseModel, Field, field_validator
from pydantic import ConfigDict
from typing import Literal, Optional


class FiltroGenero(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"ano": 2025, "estados": ["SC"], "nota_matematica": 720.5}
        }
    )

    ano: int = Field(..., ge=2009, le=2025, description="Ano de referência da edição do ENEM")
    estados: list[str] = Field(
        ...,
        min_length=1,
        max_length=27,
        description="Siglas das UFs onde a prova foi realizada, ex: ['SC', 'SP']",
    )
    nota_matematica: float = Field(
        ..., ge=0, le=1000, description="Nota do usuário na prova de Matemática (0 a 1000)"
    )

    @field_validator("estados", mode="before")
    @classmethod
    def normalizar_estados(cls, valor):
        """Normaliza (strip + maiúsculas), remove repetidas e valida cada UF."""
        if not isinstance(valor, list):
            return valor
        vistos, saida = set(), []
        for item in valor:
            if not isinstance(item, str):
                raise ValueError("Cada UF deve ser uma string de 2 letras (ex: 'SC').")
            uf = item.strip().upper()
            if uf not in UFS_VALIDAS:
                raise ValueError(
                    f"'{item}' não é uma UF brasileira válida, por exemplo SC ou SP."
                )
            if uf not in vistos:
                vistos.add(uf)
                saida.append(uf)
        return saida


class FiltroAreas(BaseModel):
    nota_cn: float = Field(..., ge=0, le=1000)
    nota_ch: float = Field(..., ge=0, le=1000)
    nota_lc: float = Field(..., ge=0, le=1000)
    nota_mt: float = Field(..., ge=0, le=1000)
    nota_redacao: float = Field(..., ge=0, le=1000)


class ResultadoArea(BaseModel):
    area: str
    nota: float
    percentil: float


class DadosRespostaAreas(BaseModel):
    areas: list[ResultadoArea]
    area_mais_forte: str
    area_mais_fraca: str
    desvio_padrao_percentis: float


class RespostaAreas(BaseModel):
    status: Literal["success", "error"]
    mensagem: str
    dados: DadosRespostaAreas


class NotaPorUFGenero(BaseModel):
    """Bloco 1 -- fonte RESULTADOS_2025 (nota x UF)."""

    fonte: str
    nota_usuario: float
    percentil_usuario: float
    zscore_usuario: float
    media_grupo_filtrado: float
    desvio_padrao_grupo: float
    total_participantes_com_nota: int


class ComposicaoDemograficaGenero(BaseModel):
    """Bloco 2 -- fonte PARTICIPANTES_2025 (sem nota)."""

    fonte: str
    total_inscritos: int
    inscritas_mulheres: int
    inscritos_homens: int
    percentual_mulheres: float
    percentual_homens: float


class DadosGenero(BaseModel):
    ano_referencia: int
    estados_referencia: list[str]
    percentil_usuario: float        # compatibilidade com o frontend do #41
    media_grupo_filtrado: float     # compatibilidade com o frontend do #41
    nota_por_uf: NotaPorUFGenero
    composicao_demografica: ComposicaoDemograficaGenero
    aviso: str


class RespostaGenero(BaseModel):
    status: Literal["success", "error"]
    mensagem: str
    dados: DadosGenero


# ===========================================================================
# Siglas oficiais das 27 unidades da federação (26 estados + DF).
# Compartilhada pelos filtros que validam UF (Escola, Nota × UF) — uma
# declaração só, pra não divergir se um dia precisar mudar.
# ===========================================================================
UFS_VALIDAS: frozenset[str] = frozenset({
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
})


# ===========================================================================
# Filtro 4 — Tipo de Escola (AV4, issue #51)
# ===========================================================================
class FiltroEscola(BaseModel):
    """Entrada da rota POST /api/dados/escola.

    - ``estado``: sigla da UF (2 letras). É normalizada (strip + maiúsculas) e
      precisa constar em ``UFS_VALIDAS``.
    - ``nota_matematica``: nota do usuário na prova de Matemática, 0 a 1000.
      Lida em modo estrito (não aceita strings nem bool); apenas int/float são
      coerentes com uma nota numérica. int é promovido a float.

    ``extra="forbid"`` rejeita campos não previstos (ex.: ``ano``), mantendo o
    contrato enxuto e previsível para o frontend.
    """

    estado: str = Field(
        ...,
        description="Sigla da UF, ex: 'SC', 'SP' (normalizada para maiúsculas).",
    )
    nota_matematica: float = Field(
        ...,
        strict=True,
        ge=0,
        le=1000,
        description="Nota do usuário na prova de Matemática (0 a 1000).",
    )

    @field_validator("estado", mode="before")
    @classmethod
    def _normalizar_e_validar_uf(cls, valor: object) -> str:
        if not isinstance(valor, str):
            raise ValueError("A UF deve ser uma string de 2 letras (ex: 'SC').")
        uf = valor.strip().upper()
        if uf not in UFS_VALIDAS:
            raise ValueError(
                "Informe uma UF brasileira válida, por exemplo SC ou SP."
            )
        return uf

    model_config = {
        "extra": "forbid",
        "json_schema_extra": {
            "example": {"estado": "SC", "nota_matematica": 620.5}
        },
    }


class CategoriaEscola(BaseModel):
    """Grupo escolar que entra no denominador válido (pública/privada).

    ``codigos`` lista os códigos oficiais de TP_DEPENDENCIA_ADM_ESC agregados no
    grupo (pública = [1, 2, 3]; privada = [4]).
    """

    chave: str
    codigos: list[int]
    rotulo: str
    quantidade: int = Field(ge=0)
    percentual_validos: Optional[float] = Field(
        default=None, ge=0, le=100,
        description="quantidade ÷ total_validos × 100 (2 casas); None se não há válidos.",
    )
    percentual_total: Optional[float] = Field(
        default=None, ge=0, le=100,
        description="quantidade ÷ total_registros_uf × 100 (2 casas); None se UF vazia.",
    )


class RegistroExcluido(BaseModel):
    """Registro fora do denominador válido (sem informação ou código não previsto)."""

    chave: str
    codigo: Optional[object] = None
    rotulo: str
    quantidade: int = Field(ge=0)
    percentual_total: Optional[float] = Field(default=None, ge=0, le=100)


class ComposicaoEscola(BaseModel):
    """Composição pública × privada da UF, com denominadores explícitos."""

    total_registros_uf: int = Field(ge=1)
    total_validos: int = Field(ge=1)
    total_excluidos: int = Field(ge=0)
    cobertura: Optional[float] = Field(
        default=None, ge=0, le=100,
        description="total_validos ÷ total_registros_uf × 100 (2 casas): proporção "
        "de registros da UF com dependência administrativa classificada.",
    )
    categorias: list[CategoriaEscola]
    excluidos: list[RegistroExcluido]
    mapeamento_confirmado: bool
    fonte_mapeamento: str


class RespostaEscola(BaseModel):
    """Saída da rota POST /api/dados/escola.

    ``dados`` carrega as duas análises independentes (desempenho e composição),
    exatamente como montadas por core.escola.analisar_tipo_escola.
    """

    status: Literal["success", "error"]
    mensagem: str
    dados: dict


# ===========================================================================
# Filtro 1 — Nota por Estado (UF) (issue #48)
# ===========================================================================
class FiltroNotaUF(BaseModel):
    """Entrada da consulta de nota por UF e área do ENEM."""

    estado: str = Field(
        ...,
        description="Sigla da unidade federativa, por exemplo SC.",
    )

    area: Literal["CN", "CH", "LC", "MT", "REDACAO"] = Field(
        ...,
        description="Área da prova do ENEM.",
    )

    nota_usuario: float = Field(
        ...,
        strict=True,
        ge=0,
        le=1000,
        description="Nota informada pelo usuário, entre 0 e 1000.",
    )

    @field_validator("estado", mode="before")
    @classmethod
    def validar_estado(cls, valor: object) -> str:
        if not isinstance(valor, str):
            raise ValueError("Informe uma sigla de UF válida.")

        uf = valor.strip().upper()

        if uf not in UFS_VALIDAS:
            raise ValueError("Informe uma UF brasileira válida.")

        return uf

    @field_validator("nota_usuario")
    @classmethod
    def validar_nota_finita(cls, valor: float) -> float:
        if not math.isfinite(valor):
            raise ValueError("A nota deve ser um número finito.")

        return valor

    model_config = {"extra": "forbid"}


class RespostaNotaUF(BaseModel):
    """Resposta da consulta estatística de nota por UF."""

    status: Literal["success", "error"]
    mensagem: str
    dados: dict
