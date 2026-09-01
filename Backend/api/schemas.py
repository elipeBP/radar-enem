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

from pydantic import BaseModel, Field
from typing import Literal


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


class RespostaGenero(BaseModel):
    """
    Modelo de saída (mock por enquanto). Ter um modelo de saída também
    garante que, quando a lógica real substituir o mock, o formato do
    JSON devolvido para o frontend não muda de surpresa.
    """

    status: Literal["success", "error"]
    mensagem: str
    dados: dict