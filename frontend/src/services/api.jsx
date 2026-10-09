
const API_URL = 'http://localhost:8000';

// false = backend espera "estado"
// true = backend espera "estados"
const BACKEND_SUPORTA_LISTA_ESTADOS = false;

export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);

    if (!response.ok) {
      throw new Error('API indisponível');
    }

    return await response.json();
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Verifique se o backend está online.',
    );
  }
}

export async function consultarGenero(filtros) {
  try {
    const payload = BACKEND_SUPORTA_LISTA_ESTADOS
      ? {
          ano: Number(filtros.ano),
          estados: filtros.estados,
          nota_matematica:
            filtros.notaMatematica === '' ||
            filtros.notaMatematica == null
              ? null
              : Number(filtros.notaMatematica),
        }
      : {
          ano: Number(filtros.ano),
          estado: filtros.estados[0] ?? null,
          nota_matematica:
            filtros.notaMatematica === '' ||
            filtros.notaMatematica == null
              ? null
              : Number(filtros.notaMatematica),
        };

    const response = await fetch(`${API_URL}/api/dados/genero`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 422) {
      throw new Error(
        'Os filtros informados são inválidos. Verifique os dados e tente novamente.',
      );
    }

    if (!response.ok) {
      throw new Error(
        `Não foi possível realizar a consulta. Erro ${response.status}.`,
      );
    }

    return await response.json();
  } catch (error) {
    if (
      error.message?.includes('filtros informados') ||
      error.message?.includes('Erro ')
    ) {
      throw error;
    }

    throw new Error(
      'Não foi possível conectar à API. Verifique se o backend está online.',
    );
  }
}

