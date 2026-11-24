import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from './layouts/AppLayout';
import Home from './pages/Home/Home';
import Genero from './pages/Genero/Genero';
import NotaUF from './pages/NotaUF/NotaUF';
import Areas from './pages/Areas/Areas';
import Escola from './pages/Escola/Escola';
import Idade from './pages/Idade/Idade';
import NotFound from './pages/NotFound/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/genero" element={<Genero />} />
          <Route path="/nota-uf" element={<NotaUF />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/escola" element={<Escola />} />
          <Route path="/idade" element={<Idade />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
