import { useState } from 'react';

export default function FormularioAreas({ onConsultar, carregando }) {
  const [notas, setNotas] = useState({
    nota_cn: '',
    nota_ch: '',
    nota_lc: '',
    nota_mt: '',
    nota_redacao: '',
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setNotas((estadoAnterior) => ({ ...estadoAnterior, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const notasConvertidas = {
      nota_cn: Number(notas.nota_cn),
      nota_ch: Number(notas.nota_ch),
      nota_lc: Number(notas.nota_lc),
      nota_mt: Number(notas.nota_mt),
      nota_redacao: Number(notas.nota_redacao),
    };

    onConsultar(notasConvertidas);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoNota label="Ciências da Natureza" name="nota_cn" value={notas.nota_cn} onChange={handleChange} />
        <CampoNota label="Ciências Humanas" name="nota_ch" value={notas.nota_ch} onChange={handleChange} />
        <CampoNota label="Linguagens" name="nota_lc" value={notas.nota_lc} onChange={handleChange} />
        <CampoNota label="Matemática" name="nota_mt" value={notas.nota_mt} onChange={handleChange} />
        <CampoNota label="Redação" name="nota_redacao" value={notas.nota_redacao} onChange={handleChange} />
      </div>

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition-colors
          hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {carregando ? 'Analisando...' : 'Analisar desempenho'}
      </button>
    </form>
  );
}

function CampoNota({ label, name, value, onChange }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </label>

      <input
        id={name}
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min="0"
        max="1000"
        step="0.1"
        required
        placeholder="0 a 1000"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900
          focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30
          dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
