import { useState } from "react";

export default function FormularioAreas({ onConsultar, carregando }) {
  const [notas, setNotas] = useState({
    nota_cn: "",
    nota_ch: "",
    nota_lc: "",
    nota_mt: "",
    nota_redacao: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setNotas((estadoAnterior) => ({
      ...estadoAnterior,
      [name]: value,
    }));
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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow p-6 space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold">
          Nota × Área do Conhecimento
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Informe suas notas do ENEM para comparar seu desempenho com a
          distribuição nacional.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CampoNota
          label="Ciências da Natureza"
          name="nota_cn"
          value={notas.nota_cn}
          onChange={handleChange}
        />

        <CampoNota
          label="Ciências Humanas"
          name="nota_ch"
          value={notas.nota_ch}
          onChange={handleChange}
        />

        <CampoNota
          label="Linguagens"
          name="nota_lc"
          value={notas.nota_lc}
          onChange={handleChange}
        />

        <CampoNota
          label="Matemática"
          name="nota_mt"
          value={notas.nota_mt}
          onChange={handleChange}
        />

        <CampoNota
          label="Redação"
          name="nota_redacao"
          value={notas.nota_redacao}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        disabled={carregando}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {carregando ? "Analisando..." : "Analisar desempenho"}
      </button>
    </form>
  );
}

function CampoNota({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>

      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min="0"
        max="1000"
        step="0.1"
        required
        placeholder="0 a 1000"
        className="w-full border rounded-lg px-3 py-2"
      />
    </div>
  );
}