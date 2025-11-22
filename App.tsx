import React, { useState } from 'react';
import { courseContent } from './data/content';
import { ModuleView } from './components/ModuleView';

const App: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState(courseContent[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeModule = courseContent.find(m => m.id === activeModuleId) || courseContent[0];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <span className="font-bold text-slate-900">CardioMastery</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight">CardioMastery</h1>
          <p className="text-xs text-slate-500 mt-1">The Harrison's Companion</p>
        </div>
        <nav className="p-4 space-y-1">
          {courseContent.map(mod => (
            <button
              key={mod.id}
              onClick={() => {
                setActiveModuleId(mod.id);
                setIsSidebarOpen(false);
                window.scrollTo(0,0);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeModuleId === mod.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {mod.title.split(':')[0]}
              <span className="block text-xs font-normal opacity-70 mt-0.5 truncate">
                {mod.title.split(':')[1]}
              </span>
            </button>
          ))}
        </nav>
        <div className="p-6 mt-auto border-t border-slate-800">
           <div className="text-xs text-slate-500">
             Based on Harrison's Principles of Internal Medicine (Cardiology Sections).
           </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 lg:h-screen lg:overflow-y-auto scroll-smooth">
        <ModuleView module={activeModule} />
      </main>
    </div>
  );
};

export default App;
