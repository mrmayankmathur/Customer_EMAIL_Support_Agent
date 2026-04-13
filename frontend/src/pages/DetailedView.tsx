import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, X, ArrowLeft, RefreshCw, Send, AlertTriangle } from 'lucide-react';

export default function DetailedView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fallback to latest pending ticket if no ID provided in the route (e.g., clicking on sidebar specific "review queue" equivalent)
  const isRecentPath = id === 'recent';

  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        if (isRecentPath) {
           const res = await axios.get('/api/v1/emails/recent?limit=1');
           if (res.data.tickets.length > 0) setTicket(res.data.tickets[0]);
        } else {
           const res = await axios.get(`/api/v1/emails/${id}`);
           setTicket(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id, isRecentPath]);

  if (loading) {
     return <div className="flex h-full items-center justify-center"><RefreshCw className="animate-spin text-accentCyan" /></div>;
  }
  
  if (!ticket) {
     return <div className="text-center p-12 text-gray-500">No ticket found or review queue empty.</div>;
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    try {
       await axios.post(`/api/v1/review/${ticket.ticket_id}?action=${action}`);
       navigate('/dashboard');
    } catch (e) {
       alert("Failed to process action. Ticket might not be pending review.");
    }
  };

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto pb-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-lightBg dark:bg-darkCard rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold dark:text-darkText">Ticket Analysis #{ticket.ticket_id}</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        {/* Left Pane: Email Input */}
        <div className="w-full lg:w-1/3 bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-borderLight dark:border-borderDark bg-gray-50 dark:bg-[#1a212e]">
             <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Input Email</h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
             <div>
               <p className="text-xs text-gray-400 uppercase mb-1">From</p>
               <p className="font-medium dark:text-darkText">{ticket.email.sender}</p>
             </div>
             <div>
               <p className="text-xs text-gray-400 uppercase mb-1">Subject</p>
               <p className="font-semibold text-lg dark:text-white">{ticket.email.subject}</p>
             </div>
             <div>
               <p className="text-xs text-gray-400 uppercase mb-2">Body</p>
               <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                 {ticket.email.body}
               </div>
             </div>
          </div>
        </div>

        {/* Center Pane: AI Processing Log (Vertical Flow) */}
        <div className="w-full lg:w-1/3 bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-borderLight dark:border-borderDark bg-gray-50 dark:bg-[#1a212e]">
             <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">AI Processing Log</h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
             
             {/* Flow Timeline */}
             <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
               
               <div className="relative">
                 <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-accentCyan ring-4 ring-lightBg dark:ring-darkCard shadow-glow-cyan z-10"></div>
                 <h4 className="font-semibold text-sm dark:text-darkText">Classifier</h4>
                 <div className="mt-2 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                   <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="text-gray-500">Predicted Category</span>
                      <span className="text-accentCyan font-mono uppercase bg-accentCyan/10 px-2 rounded">{ticket.category}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Confidence</span>
                      <span className="text-accentCyan font-mono text-xs">{ticket.confidence * 100}%</span>
                   </div>
                 </div>
               </div>

               <div className="relative">
                 <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-accentCyan ring-4 ring-lightBg dark:ring-darkCard z-10"></div>
                 <h4 className="font-semibold text-sm dark:text-darkText">Retriever</h4>
                 <div className="mt-2 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                   <p className="text-xs text-gray-500 mb-2">Knowledge Base Chunks Retrieved:</p>
                   <ul className="text-xs space-y-2 dark:text-gray-300 list-disc pl-3">
                     {ticket.context?.map((chunk: string, i: number) => (
                        <li key={i} className="truncate" title={chunk}>{chunk.substring(0, 60)}...</li>
                     ))}
                     {(!ticket.context || ticket.context.length === 0) && <li>No specific context fetched.</li>}
                   </ul>
                 </div>
               </div>

               <div className="relative">
                 <div className={`absolute -left-[30px] w-4 h-4 rounded-full ${ticket.needs_escalation ? 'bg-accentRed shadow-glow-red' : 'bg-accentGreen'} ring-4 ring-lightBg dark:ring-darkCard z-10`}></div>
                 <h4 className="font-semibold text-sm dark:text-darkText">Escalation Evaluation</h4>
                 <div className="mt-2 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    {ticket.needs_escalation ? (
                       <div className="text-accentRed text-xs font-medium space-y-1">
                          <p className="flex items-center gap-1"><AlertTriangle size={14}/> Escalation Triggered</p>
                          <p className="opacity-80 mt-1 italic">{ticket.escalation_reason}</p>
                       </div>
                    ) : (
                       <div className="text-accentGreen text-xs font-medium flex items-center gap-1">
                         <Check size={14} /> Auto-draft Approved by Guards
                       </div>
                    )}
                 </div>
               </div>

             </div>
          </div>
        </div>

        {/* Right Pane: AI Draft & Action (Escalation Focus) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-borderLight dark:border-borderDark bg-gray-50 dark:bg-[#1a212e] flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Draft Review & Action</h3>
              <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider ${ticket.status === 'pending_review' ? 'bg-accentRed/20 text-accentRed shadow-glow-red animate-pulse' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>
                 {ticket.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
               <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed font-sans">
                 {ticket.draft_response || ticket.final_response || <span className="italic opacity-50">No draft available.</span>}
               </div>
            </div>

            <div className="p-4 border-t border-borderLight dark:border-borderDark bg-gray-50 dark:bg-[#1a212e]">
               {ticket.status === 'pending_review' ? (
                 <div className="flex gap-3">
                   <button 
                     onClick={() => handleAction('approve')}
                     className="flex-1 flex items-center justify-center gap-2 bg-accentGreen text-darkBg py-3 rounded-lg font-bold hover:bg-opacity-90 transition"
                   >
                     <Send size={18} /> Send Draft (Auto)
                   </button>
                   <button 
                     onClick={() => handleAction('reject')}
                     className="flex-1 flex items-center justify-center gap-2 border border-accentRed text-accentRed py-3 rounded-lg font-bold hover:bg-accentRed/10 transition"
                   >
                     <X size={18} /> Reject
                   </button>
                 </div>
               ) : (
                 <div className="text-center text-sm font-medium text-gray-500 py-2">
                    Action already taken on this ticket.
                 </div>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
