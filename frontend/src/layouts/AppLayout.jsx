
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from '../components/Sidebar/sidebar';
import './AppLayout.css';

function AppLayout() {
  const [sidebarExpandida, setSidebarExpandida] = useState(true);

  function alternarSidebar() {
    setSidebarExpandida((expandida) => !expandida);
  }

  return (
    <div
      className={`app-layout ${
        sidebarExpandida
          ? 'app-layout--expanded'
          : 'app-layout--collapsed'
      }`}
    >
      <Sidebar
        expandida={sidebarExpandida}
        onToggle={alternarSidebar}
      />

      <main className="app-layout__page">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
