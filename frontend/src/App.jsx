import { useEffect, useState } from 'react'
import Sidebar from './components/sidebar'
import StatusBadge from './components/statusBadge'
import {checkApiHealth, consultarGenero} from './services/api'
import ResultadoGenero from './components/ResultadoGenero'

function App() {
  // Estados dos filtros
  const [ano, setAno] = useState('2024')
  const [estados, setEstados] = useState([])
  const [notaMatematica, setNotaMatematica] = useState('')

  // Estado da conexão com a API
  const [apiStatus, setApiStatus] = useState('checking')

  // Estados da consulta
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  // Verifica a conexão com a API ao carregar a página
  useEffect(() => {
    async function verificarApi() {
      try {
        await checkApiHealth()
        setApiStatus('online')
      } catch (error) {
        console.error('Erro ao conectar com a API:', error)
        setApiStatus('offline')
      }
    }

    verificarApi()
  }, [])

  // Faz a consulta quando o usuário clicar no botão
async function handleConsultar() {
  setLoading(true)
  setErro('')
  setResultado(null)

  const filtros = {
    ano: Number(ano),
    estados: estados,
    nota_matematica: Number(notaMatematica),
  }

  try {
    const resposta = await consultarGenero(filtros)

    setResultado(resposta.dados)
  } catch (error) {
    setErro(error.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-slate-100 md:flex">

      {/* SIDEBAR */}
      <Sidebar
        ano={ano}
        setAno={setAno}
        estados={estados}
        setEstados={setEstados}
        notaMatematica={notaMatematica}
        setNotaMatematica={setNotaMatematica}
        onConsultar={handleConsultar}
        loading={loading}
      />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 md:p-12">

        <div className="mx-auto max-w-6xl">

          {/* CABEÇALHO */}
          <header className="mb-10">

            <p className="mb-2 font-semibold text-blue-600">
              Produto de Dados
            </p>

            <h2 className="text-4xl font-bold text-slate-900">
              Dashboard Radar ENEM
            </h2>

            <p className="mt-3 text-slate-600">
              Explore indicadores educacionais e diferenças
              de desempenho entre os estados brasileiros.
            </p>

          </header>

          {/* STATUS DA API */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Status de Conexão com API
            </h3>

            <StatusBadge status={apiStatus} />

          </section>

          {/* FILTROS SELECIONADOS */}
          <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">

            <h3 className="mb-5 text-lg font-semibold text-slate-900">
              Filtros Selecionados
            </h3>

            <div className="grid gap-4 md:grid-cols-3">

              {/* ANO */}
              <div className="rounded-lg bg-slate-50 p-4">

                <p className="text-sm text-slate-500">
                  Ano
                </p>

                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {ano}
                </p>

              </div>

              {/* ESTADOS */}
              <div className="rounded-lg bg-slate-50 p-4">

                <p className="text-sm text-slate-500">
                  Estados
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {estados.length > 0
                    ? estados.join(', ')
                    : 'Nenhum selecionado'}
                </p>

              </div>

              {/* NOTA */}
              <div className="rounded-lg bg-slate-50 p-4">

                <p className="text-sm text-slate-500">
                  Nota Matemática
                </p>

                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {notaMatematica || 'Não informada'}
                </p>

              </div>

            </div>
          </section>

          <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">

              <h3 className="mb-5 text-lg font-semibold text-slate-900">
                Resultado da Consulta
              </h3>

              <ResultadoGenero
                resultado={resultado}
                loading={loading}
                erro={erro}
              />
          </section>

        </div>

      </main>

    </div>
  )
}

export default App