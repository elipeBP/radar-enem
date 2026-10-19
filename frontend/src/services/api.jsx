
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

// ---------------------------------------------------------
// ANÁLISE NOTA × ÁREA DO CONHECIMENTO (issue #49)
// ---------------------------------------------------------

export async function consultarAreas(notas) {
  const payload = {
    nota_cn: notas.nota_cn,
    nota_ch: notas.nota_ch,
    nota_lc: notas.nota_lc,
    nota_mt: notas.nota_mt,
    nota_redacao: notas.nota_redacao,
  };

  let response;

  try {
    response = await fetch(`${API_URL}/api/dados/areas`, {
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
      'As notas informadas são inválidas. Informe valores entre 0 e 1000.',
      422,
    );
  }

  if (!response.ok) {
    throw criarErroApi(
      `Não foi possível realizar a análise. Erro ${response.status}.`,
      response.status,
    );
  }

  return await response.json();
}

// ---------------------------------------------------------
// FILTRO 4 — TIPO DE ESCOLA (issue #51)
// ---------------------------------------------------------

const MENSAGENS_ESCOLA = {
  404: 'Não há dados suficientes para a UF selecionada na base de referência.',
  422: 'Os dados enviados são inválidos. Confira a UF e a nota (0 a 1000).',
  503: 'Os dados de referência do ENEM 2025 não estão disponíveis no servidor no momento.',
};

function extrairDetalhe(payload) {
  if (!payload) return null;
  if (typeof payload.detail === 'string') return payload.detail;
  // 422 do FastAPI: lista de erros [{ loc, msg, ... }]
  if (Array.isArray(payload.detail)) {
    const msgs = payload.detail
      .map((item) => (item?.msg || '').replace(/^Value error, /, ''))
      .filter(Boolean);
    return msgs.length ? msgs.join(' ') : null;
  }
  return null;
}

export async function consultarEscola(filtros) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/dados/escola`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: filtros.estado,
        nota_matematica: filtros.nota_matematica,
      }),
    });
  } catch {
    throw criarErroApi(
      'Não foi possível conectar à API. Verifique se o backend está online.',
    );
  }

  if (!response.ok) {
    let detalhe = null;
    try {
      detalhe = extrairDetalhe(await response.json());
    } catch {
      // Mantém a mensagem genérica se a API não devolver JSON legível.
    }
    const base =
      MENSAGENS_ESCOLA[response.status] ||
      `Não foi possível realizar a consulta. Erro ${response.status}.`;
    throw criarErroApi(
      detalhe ? `${base} Detalhe: ${detalhe}` : base,
      response.status,
    );
  }

  const corpo = await response.json();
  if (!corpo?.dados?.desempenho || !corpo?.dados?.composicao_escolar) {
    throw criarErroApi(
      'A API respondeu em um formato inesperado para o filtro de tipo de escola.',
    );
  }
  return corpo;
}
