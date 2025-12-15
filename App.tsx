import React from 'react';
import YangBuilder from './components/YangBuilder';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <YangBuilder />
    </div>
  );
};

export default App;