import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ProjectStatus } from './pages/ProjectStatus';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { Navigation } from './components/Navigation';
import './app.module.css';

export default function App() {
  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project-status" element={<ProjectStatus />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
