const API_URL = 'http://localhost:8000'

// TEMPORÁRIO:
// false = backend atual espera "estado"
// true = backend novo espera "estados"
const BACKEND_SUPORTA_LISTA_ESTADOS = false

export async function checkApiHealth() {
  const response = await fetch(`${API_URL}/api/health`)

  if (!response.ok) {
    throw new Error('API indisponível')
  }

  return response.json()
}

export async function consultarGenero(filtros) {
  try {
    const payload = BACKEND_SUPORTA_LISTA_ESTADOS
      ? {
          ano: filtros.ano,
          estados: filtros.estados,
          nota_matematica: filtros.nota_matematica,
        }
      : {
          ano: filtros.ano,
          estado: filtros.estados[0],
          nota_matematica: filtros.nota_matematica,
        }

    const response = await fetch(`${API_URL}/api/dados/genero`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 422) {
      const erro = new Error(
        'Os filtros informados são inválidos. Verifique os dados e tente novamente.'
      )

      erro.status = 422

      throw erro
    }

    if (!response.ok) {
      const erro = new Error(
        `Não foi possível realizar a consulta. Erro ${response.status}.`
      )

      erro.status = response.status

      throw erro
    }

    return await response.json()
  } catch (error) {
    if (error.status) {
      throw error
    }

    throw new Error(
      'Não foi possível conectar à API. Verifique se o backend está online.'
    )
  }
}