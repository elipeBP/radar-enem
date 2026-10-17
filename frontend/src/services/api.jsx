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

const MENSAGENS_ESCOLA = {
  404: 'Não há dados suficientes para a UF selecionada na base de referência.',
  422: 'Os dados enviados são inválidos. Confira a UF e a nota (0 a 1000).',
  503: 'Os dados de referência do ENEM 2025 não estão disponíveis no servidor no momento.',
}

function extrairDetalhe(payload) {
  if (!payload) return null
  if (typeof payload.detail === 'string') return payload.detail
  // 422 do FastAPI: lista de erros [{ loc, msg, ... }]
  if (Array.isArray(payload.detail)) {
    const msgs = payload.detail
      .map((item) => (item?.msg || '').replace(/^Value error, /, ''))
      .filter(Boolean)
    return msgs.length ? msgs.join(' ') : null
  }
  return null
}

export async function consultarEscola(filtros) {
  let response
  try {
    response = await fetch(`${API_URL}/api/dados/escola`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: filtros.estado,
        nota_matematica: filtros.nota_matematica,
      }),
    })
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Verifique se o backend está online.'
    )
  }

  if (!response.ok) {
    let detalhe = null
    try {
      detalhe = extrairDetalhe(await response.json())
    } catch {
      // Mantém a mensagem genérica se a API não devolver JSON legível.
    }
    const base = MENSAGENS_ESCOLA[response.status]
      || `Não foi possível realizar a consulta. Erro ${response.status}.`
    const erro = new Error(detalhe ? `${base} Detalhe: ${detalhe}` : base)
    erro.status = response.status
    throw erro
  }

  const corpo = await response.json()
  if (!corpo?.dados?.desempenho || !corpo?.dados?.composicao_escolar) {
    throw new Error('A API respondeu em um formato inesperado para o filtro de tipo de escola.')
  }
  return corpo
}
