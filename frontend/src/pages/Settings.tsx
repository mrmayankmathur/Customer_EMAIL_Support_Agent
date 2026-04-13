import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, FileText, Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get('/api/v1/config');
        setConfig(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchConfig();
  }, []);

  if (!config) return <div className="p-10">Loading configuration...</div>;

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full gap-6 pb-8">
      <header className="mb-2 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold dark:text-darkText">System Configuration</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage knowledge base and LLM prompt templates.</p>
        </div>
        <button className="flex items-center gap-2 bg-accentCyan text-white px-6 py-2.5 rounded-lg font-semibold shadow-glow-cyan hover:-translate-y-0.5 transition-transform">
           <Save size={18} /> Save & Deploy
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Knowledge Base Config */}
        <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col overflow-hidden">
           <div className="p-5 border-b border-borderLight dark:border-borderDark flex items-center gap-3">
             <Database className="text-accentCyan" size={20} />
             <h2 className="font-bold dark:text-darkText">Knowledge Base Visualizer</h2>
           </div>
           
           <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-4 px-2">Data Sources</h3>
              <div className="border border-borderLight dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.knowledge_base.map((kb: any) => (
                       <tr key={kb.id} className="border-t border-gray-100 dark:border-gray-700">
                         <td className="px-4 py-3 font-mono text-xs">{kb.id}</td>
                         <td className="px-4 py-3 font-medium dark:text-gray-200 flex items-center gap-2">
                           <FileText size={14} className="text-gray-400"/> {kb.title}
                         </td>
                         <td className="px-4 py-3 text-gray-500">{kb.updated}</td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-gray-500 mt-8 mb-4 px-2">Retriever Settings</h3>
              <div className="space-y-6 px-2">
                 <div>
                   <div className="flex justify-between mb-2">
                     <span className="text-sm dark:text-gray-300">Top K Results</span>
                     <span className="text-sm font-mono text-accentCyan">{config.settings.top_k_results}</span>
                   </div>
                   <input type="range" min="1" max="10" defaultValue={config.settings.top_k_results} className="w-full accent-accentCyan"/>
                 </div>
                 <div>
                   <div className="flex justify-between mb-2">
                     <span className="text-sm dark:text-gray-300">Confidence Threshold</span>
                     <span className="text-sm font-mono text-accentCyan">{config.settings.confidence_threshold}</span>
                   </div>
                   <input type="range" min="0" max="1" step="0.05" defaultValue={config.settings.confidence_threshold} className="w-full accent-accentCyan"/>
                 </div>
              </div>
           </div>
        </div>

        {/* Prompt Management */}
        <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-darkCard rounded-2xl flex flex-col overflow-hidden">
           <div className="p-5 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
             <div className="flex items-center gap-3">
               <SettingsIcon className="text-accentCyan" size={20} />
               <h2 className="font-bold dark:text-darkText">LLM Prompt Management</h2>
             </div>
             <div className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-mono">Model: {config.settings.model_selection}</div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex justify-between">
                    <span>Classifier Prompt</span>
                    <span className="text-[10px] text-accentCyan bg-accentCyan/10 px-1 rounded">JSON Structuring</span>
                 </label>
                 <textarea 
                    className="w-full h-32 bg-[#F8FAFC] dark:bg-[#0D1117] text-gray-800 dark:text-[#A5D6FF] border border-borderLight dark:border-[#30363D] rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-accentCyan transition-colors resize-none"
                    defaultValue={config.prompts.classifier}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Retriever Prompt</label>
                 <textarea 
                    className="w-full h-32 bg-[#F8FAFC] dark:bg-[#0D1117] text-gray-800 dark:text-[#A5D6FF] border border-borderLight dark:border-[#30363D] rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-accentCyan transition-colors resize-none"
                    defaultValue={config.prompts.retriever}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex justify-between">
                    <span>Responder Prompt</span>
                    <span className="text-[10px] text-accentGreen bg-accentGreen/10 px-1 rounded">Final Output Gen</span>
                 </label>
                 <textarea 
                    className="w-full h-32 bg-[#F8FAFC] dark:bg-[#0D1117] text-gray-800 dark:text-[#A5D6FF] border border-borderLight dark:border-[#30363D] rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-accentCyan transition-colors resize-none"
                    defaultValue={config.prompts.responder}
                 />
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}
