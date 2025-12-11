import React, { useState } from 'react';
import { AppState, Protocol } from './types';
import { DEFAULT_PROTOCOLS } from './constants';
import LiveSession from './components/LiveSession';
import { Activity, ShieldCheck, ChevronRight, FileText, Settings, Play } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(DEFAULT_PROTOCOLS[0]);

  // --- Screens ---

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-teal-100 text-teal-700 rounded-2xl mb-4">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Mend</h1>
        <p className="text-lg text-slate-600">Your AI-powered Post-Op Recovery Guardian</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <FileText className="mr-2 text-teal-600" size={20} />
                Select Protocol
              </h2>
              <div className="space-y-3">
                {DEFAULT_PROTOCOLS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProtocol(p)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedProtocol.id === p.id 
                      ? 'border-teal-500 bg-teal-50 shadow-md' 
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                       <span className={`font-semibold ${selectedProtocol.id === p.id ? 'text-teal-900' : 'text-slate-700'}`}>{p.name}</span>
                       {selectedProtocol.id === p.id && <Activity size={16} className="text-teal-500" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">{p.description}</p>
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="flex flex-col justify-between space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                 <Settings className="mr-2 text-teal-600" size={20} />
                 Session Details
              </h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Area</label>
                    <div className="text-lg font-medium text-slate-800">{selectedProtocol.focusArea}</div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Watchpoints</label>
                    <ul className="space-y-2">
                       {selectedProtocol.keyInstructions.map((inst, i) => (
                         <li key={i} className="flex items-start text-sm text-slate-600">
                            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-1.5 mr-2 shrink-0"></span>
                            {inst}
                         </li>
                       ))}
                    </ul>
                 </div>
              </div>
           </div>

           <button 
             onClick={() => setAppState(AppState.SESSION)}
             className="w-full bg-slate-900 hover:bg-teal-600 text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform transition-all duration-200 flex items-center justify-center group"
           >
             Start Recovery Session
             <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
      
      <div className="mt-12 text-center text-sm text-slate-400">
         <p>Powered by Gemini 2.5 Flash Native Audio</p>
      </div>
    </div>
  );

  const renderSession = () => (
    <div className="h-screen w-full bg-slate-950 p-4">
      <LiveSession 
        protocol={selectedProtocol} 
        onEndSession={() => setAppState(AppState.SUMMARY)} 
      />
    </div>
  );

  const renderSummary = () => (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
       <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
          <div className="inline-flex items-center justify-center p-4 bg-green-100 text-green-600 rounded-full mb-6">
            <CheckCircleIcon size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Session Complete</h2>
          <p className="text-slate-600 mb-8">
            Great job! Regular practice is key to recovery. 
            Mend monitored your form during <strong>{selectedProtocol.name}</strong>.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">100%</div>
                <div className="text-xs text-slate-500 uppercase font-semibold">Completion</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">Good</div>
                <div className="text-xs text-slate-500 uppercase font-semibold">Stability Score</div>
             </div>
          </div>

          <button 
            onClick={() => setAppState(AppState.SETUP)}
            className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-200">
      {appState === AppState.SETUP && renderSetup()}
      {appState === AppState.SESSION && renderSession()}
      {appState === AppState.SUMMARY && renderSummary()}
    </div>
  );
};

// Simple internal icon for the summary screen
const CheckCircleIcon = ({ size }: { size: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default App;
