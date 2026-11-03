import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Areas from './pages/Areas/Areas';
import Escola from './pages/Escola/Escola';
import NotFound from './pages/NotFound/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/escola" element={<Escola />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;