import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from '../components/Sidebar/sidebar';
import { IconMenu } from '../components/icons/Icons';

function AppLayout() {
  const [sidebarExpandida, setSidebarExpandida] = useState(true);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        expandida={sidebarExpandida}
        onToggleExpandida={() => setSidebarExpandida((atual) => !atual)}
        aberta={menuMobileAberto}
        onFecharMobile={() => setMenuMobileAberto(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMenuMobileAberto(true)}
            aria-label="Abrir menu"
            aria-controls="app-sidebar"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <IconMenu className="size-6" />
          </button>
          <img src="/radar.svg" alt="" className="size-6" />
          <span className="font-bold text-slate-900 dark:text-white">Radar ENEM</span>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
