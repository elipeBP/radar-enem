
const API_URL = 'http://localhost:8000';

// false = backend espera "estado"
// true = backend espera "estados"
const BACKEND_SUPORTA_LISTA_ESTADOS = false;

function criarErroApi(mensagem, status = null) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

export async function checkApiHealth() {
  let response;

  try {
    response = await fetch(`${API_URL}/api/health`);
  } catch {
    throw criarErroApi(
      'Não foi possível conectar à API. Verifique se o backend está online.',
    );
  }

  if (!response.ok) {
    throw criarErroApi(
      `A API está indisponível. Erro ${response.status}.`,
      response.status,
    );
  }

  return await response.json();
}

export async function consultarGenero(filtros) {
  const notaMatematica =
    filtros.notaMatematica === '' || filtros.notaMatematica == null
      ? null
      : Number(filtros.notaMatematica);

  const payload = BACKEND_SUPORTA_LISTA_ESTADOS
    ? {
        ano: Number(filtros.ano),
        estados: filtros.estados,
        nota_matematica: notaMatematica,
      }
    : {
        ano: Number(filtros.ano),
        estado: filtros.estados[0] ?? null,
        nota_matematica: notaMatematica,
      };

  let response;

  try {
    response = await fetch(`${API_URL}/api/dados/genero`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw criarErroApi(
      'Não foi possível conectar à API. Verifique se o backend está online.',
    );
  }

  if (response.status === 422) {
    throw criarErroApi(
      'Os filtros informados são inválidos. Verifique os dados e tente novamente.',
      422,
    );
  }

  if (!response.ok) {
    throw criarErroApi(
      `Não foi possível realizar a consulta. Erro ${response.status}.`,
      response.status,
    );
  }

  return await response.json();
}

export async function consultarNotaUF(filtros) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/dados/uf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estado: filtros.estado,
        area: filtros.area,
        nota_usuario: Number(filtros.nota),
      }),
    });
  } catch {
    throw criarErroApi(
      'Não foi possível conectar à API. Verifique se o backend está online.',
    );
  }

  let dados;

  try {
    dados = await response.json();
  } catch {
    throw criarErroApi(
      'A API retornou uma resposta inválida.',
      response.status,
    );
  }

  if (!response.ok) {
    const detalhe = dados?.detail;

    const mensagem = Array.isArray(detalhe)
      ? detalhe.map((item) => item.msg).join('; ')
      : detalhe;

    throw criarErroApi(
      mensagem ||
        `Não foi possível consultar a nota. Erro ${response.status}.`,
      response.status,
    );
  }

  return dados;
}
