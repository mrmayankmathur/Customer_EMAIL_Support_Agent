import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import DetailedView from './pages/DetailedView';
import Settings from './pages/Settings';
import Compose from './pages/Compose';
import Inbox from './pages/Inbox';
import ReviewQueue from './pages/ReviewQueue';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-lightBg dark:bg-darkBg text-lightText dark:text-darkText transition-colors duration-200">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/ticket/:id" element={<DetailedView />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
