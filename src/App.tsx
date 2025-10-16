import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChatProvider } from '@/context/ChatContext';
import LandingPage from '@/pages/LandingPage';
import TimerPage from '@/pages/TimerPage';

const App: React.FC = () => {
  return (
    <Router>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/workflow" element={<div className="p-8 text-center">Workflow page coming soon...</div>} />
        </Routes>
      </ChatProvider>
    </Router>
  );
};

export default App;

