import React, { useState, useEffect } from 'react';
import { Activity, LayoutDashboard, Users, Calendar, Settings } from 'lucide-react';

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...');

  useEffect(() => {
    // Intentar conectar con la API
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setApiStatus('Online 🟢'))
      .catch(err => setApiStatus('Offline 🔴'));
  }, []);

  return (
    <div className="layout">
      {/* Sidebar Glassmorphism */}
      <aside className="sidebar glass">
        <div className="brand">
          <div className="logo-icon">N</div>
          <h2>Nexus Cockpit</h2>
        </div>
        
        <nav className="nav-menu">
          <a href="#" className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a href="#" className="nav-item">
            <Users size={20} />
            <span>Clientes</span>
          </a>
          <a href="#" className="nav-item">
            <Calendar size={20} />
            <span>Citas</span>
          </a>
          <a href="#" className="nav-item">
            <Settings size={20} />
            <span>Configuración</span>
          </a>
        </nav>
        
        <div className="api-status">
          <Activity size={16} className={apiStatus.includes('Online') ? 'text-success' : 'text-danger'} />
          <span>API Status: <strong>{apiStatus}</strong></span>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        <header className="topbar glass">
          <h1>Resumen General</h1>
          <div className="user-profile">
            <img src="https://ui-avatars.com/api/?name=Admin+User&background=6c5ce7&color=fff" alt="Admin" className="avatar" />
          </div>
        </header>

        <div className="dashboard-grid">
          {/* Tarjetas de Estadísticas */}
          <div className="stat-card glass slide-up" style={{animationDelay: '0.1s'}}>
            <div className="stat-title">Citas Hoy</div>
            <div className="stat-value">12</div>
            <div className="stat-trend positive">+2 vs ayer</div>
          </div>
          
          <div className="stat-card glass slide-up" style={{animationDelay: '0.2s'}}>
            <div className="stat-title">Nuevos Clientes</div>
            <div className="stat-value">5</div>
            <div className="stat-trend positive">+15% este mes</div>
          </div>
          
          <div className="stat-card glass slide-up" style={{animationDelay: '0.3s'}}>
            <div className="stat-title">Tasa de Asistencia</div>
            <div className="stat-value">94%</div>
            <div className="stat-trend static">Igual que ayer</div>
          </div>

          <div className="stat-card glass slide-up" style={{animationDelay: '0.4s'}}>
            <div className="stat-title">Ingresos Estimados</div>
            <div className="stat-value">$1,250</div>
            <div className="stat-trend positive">+5% vs ayer</div>
          </div>
        </div>

        {/* Sección de Actividad Reciente */}
        <section className="recent-activity glass slide-up" style={{animationDelay: '0.5s'}}>
          <h2>Próximas Citas</h2>
          <div className="empty-state">
            <p>Conectaremos esto a tu base de datos MySQL pronto.</p>
          </div>
        </section>
      </main>
      
      {/* Elementos decorativos de fondo */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
    </div>
  );
}

export default App;
