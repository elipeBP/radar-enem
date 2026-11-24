import { useEffect, useState } from 'react';

const CHAVE_ARMAZENAMENTO = 'radar-enem-tema';

function lerPreferenciaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (salvo === 'escuro' || salvo === 'claro') {
      return salvo === 'escuro';
    }
  } catch {
    // localStorage indisponível (modo privado etc.) -- usa a preferência do SO.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Tema persistido em localStorage, já aplicado no <html> antes do primeiro
 * paint por um script inline em index.html (evita flash do tema errado).
 * Este hook só sincroniza o estado do React com essa classe depois.
 */
export function useTheme() {
  const [escuro, setEscuro] = useState(lerPreferenciaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro);

    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, escuro ? 'escuro' : 'claro');
    } catch {
      // Sem persistência disponível -- o tema ainda funciona nesta sessão.
    }
  }, [escuro]);

  function alternarTema() {
    setEscuro((atual) => !atual);
  }

  return { escuro, alternarTema };
}
