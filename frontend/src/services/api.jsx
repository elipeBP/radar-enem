const API_URL = 'http://localhost:8000'

export async function checkApiHealth() {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000)

  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    return true
  } finally {
    clearTimeout(timeout)
  }
}