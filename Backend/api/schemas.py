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

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional


class FiltroGenero(BaseModel):
    """
    Modelo de entrada para o módulo de análise (ex: Trilha de Gênero nas Exatas).

    Cada campo abaixo é validado automaticamente pelo FastAPI:
    se o cliente (React) mandar um tipo errado (ex: nota_matematica como
    string "abc"), a API já rejeita a requisição com erro 422 antes mesmo
    de chegar na sua função de rota.
    """

    ano: int = Field(
        ...,  # "..." = campo obrigatório, sem valor default
        ge=2009,  # ge = "greater or equal", validação simples de sanidade
        le=2025,
        description="Ano de referência da edição do ENEM (ex: 2024)",
    )
    estado: str = Field(
        ...,
        min_length=2,
        max_length=2,
        description="Sigla da UF, ex: 'SC', 'SP'",
    )
    nota_matematica: float = Field(
        ...,
        ge=0,
        le=1000,
        description="Nota do usuário na prova de Matemática (0 a 1000)",
    )

    class Config:
        # Exemplo que aparece automaticamente na doc interativa (/docs)
        json_schema_extra = {
            "example": {"ano": 2024, "estado": "SC", "nota_matematica": 720.5}
        }

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

class RespostaGenero(BaseModel):
    """
    Modelo de saída (mock por enquanto). Ter um modelo de saída também
    garante que, quando a lógica real substituir o mock, o formato do
    JSON devolvido para o frontend não muda de surpresa.
    """

    status: Literal["success", "error"]
    mensagem: str
    dados: dict


# ===========================================================================
# Filtro 4 — Tipo de Escola (AV4, issue #51)
# ===========================================================================
# Siglas oficiais das 27 unidades da federação (26 estados + DF). Usadas para
# validar o campo `estado` do filtro: qualquer sigla fora desta lista é 422.
UFS_VALIDAS: frozenset[str] = frozenset({
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
})


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
