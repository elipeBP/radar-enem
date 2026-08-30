import { useEffect, useState } from 'react'
import { checkApiHealth } from './services/api'
import Sidebar from './components/sidebar'
import StatusBadge from './components/statusBadge'

function App() {

  const [ano, setAno] = useState('2024')
  const [estados, setEstados] = useState([])
  const [notaMatematica, setNotaMatematica] = useState('')

  const [apiStatus, setApiStatus] = useState('checking')

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

  return (
    <div className="min-h-screen bg-slate-100 md:flex">

      <Sidebar
        ano={ano}
        setAno={setAno}
        estados={estados}
        setEstados={setEstados}
        notaMatematica={notaMatematica}
        setNotaMatematica={setNotaMatematica}
      />

      <main className="flex-1 p-8 md:p-12">

        <div className="mx-auto max-w-6xl">

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

          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Status de Conexão com API
            </h3>

            <StatusBadge status={apiStatus} />

          </section>

          <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">

            <h3 className="mb-5 text-lg font-semibold text-slate-900">
              Filtros Selecionados
            </h3>

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Ano
                </p>

                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {ano}
                </p>
              </div>

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

        </div>

      </main>

    </div>
  )
}

export default App