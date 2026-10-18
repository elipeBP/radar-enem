import { useEffect, useState } from 'react'

import Sidebar from './components/sidebar'
import StatusBadge from './components/statusBadge'
import ResultadoGenero from './components/ResultadoGenero'
import FormularioAreas from './components/FormularioAreas'
import ResultadoAreas from './components/ResultadoAreas'

import {
  checkApiHealth,
  consultarGenero,
  consultarAreas,
} from './services/api'

function App() {
  // FILTROS - ANÁLISE DE GÊNERO

  const [ano, setAno] = useState('2024')
  const [estados, setEstados] = useState([])
  const [notaMatematica, setNotaMatematica] = useState('')

  // STATUS DA API
  const [apiStatus, setApiStatus] = useState('checking')

  // CONSULTA - GÊNERO

  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  
  // CONSULTA - NOTA × ÁREA DO CONHECIMENTO

  const [loadingAreas, setLoadingAreas] = useState(false)
  const [resultadoAreas, setResultadoAreas] = useState(null)
  const [erroAreas, setErroAreas] = useState('')

  // VERIFICA STATUS DA API

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

  // CONSULTA DE GÊNERO

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

  // CONSULTA NOTA × ÁREA DO CONHECIMENTO

  async function handleConsultarAreas(notas) {
    setLoadingAreas(true)
    setErroAreas('')
    setResultadoAreas(null)

    try {
      const resposta = await consultarAreas(notas)

      setResultadoAreas(resposta.dados)
    } catch (error) {
      setErroAreas(error.message)
    } finally {
      setLoadingAreas(false)
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
              Explore indicadores educacionais e análises comparativas
              de desempenho no ENEM.
            </p>

          </header>

          {/* STATUS DA API */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Status de Conexão com API
            </h3>

            <StatusBadge status={apiStatus} />

          </section>

          {/* ANÁLISE DE GÊNERO */}

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

          {/* RESULTADO GÊNERO */}
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

          {/* NOTA × ÁREA DO CONHECIMENTO */}

          <section className="mt-10">

            <div className="mb-5">

              <p className="font-semibold text-blue-600">
                Análise Individual
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Nota × Área do Conhecimento
              </h2>

              <p className="mt-2 text-slate-600">
                Compare seu desempenho nas cinco áreas do ENEM com a
                distribuição nacional de participantes.
              </p>

            </div>

            <FormularioAreas
              onConsultar={handleConsultarAreas}
              carregando={loadingAreas}
            />

            {/* ERRO */}
            {erroAreas && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">

                <p className="font-medium text-red-700">
                  {erroAreas}
                </p>

              </div>
            )}

            {/* RESULTADO */}
            {resultadoAreas && (
              <div className="mt-6">

                <ResultadoAreas resultado={resultadoAreas} />

              </div>
            )}

          </section>

        </div>

      </main>

    </div>
  )
}

export default App