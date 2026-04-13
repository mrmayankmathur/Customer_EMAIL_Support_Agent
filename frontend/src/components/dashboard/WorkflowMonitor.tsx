import { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: 'start', position: { x: 50, y: 150 }, data: { label: '📧 Incoming Email' }, type: 'input' },
  { id: 'classifier', position: { x: 250, y: 150 }, data: { label: '🧠 Classifier' } },
  { id: 'retriever', position: { x: 450, y: 150 }, data: { label: '🔍 Retriever' } },
  { id: 'responder', position: { x: 650, y: 150 }, data: { label: '✍️ Responder' } },
  { id: 'escalation', position: { x: 450, y: 250 }, data: { label: '⚠️ Escalation' }, type: 'output' },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'classifier', animated: true },
  { id: 'e2', source: 'classifier', target: 'retriever', animated: true },
  { id: 'e3', source: 'retriever', target: 'responder', animated: true },
  { id: 'e4', source: 'classifier', target: 'escalation', animated: false, style: { stroke: '#EF4444' } },
];

export default function WorkflowMonitor() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);

  // Simulate active node pulsing
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === 'retriever' || n.id === 'responder') {
             // Fake active pulse
             return {
                ...n,
                style: {
                   background: '#212936',
                   color: '#D1D5DB',
                   border: '2px solid #06B6D4',
                   boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                   borderRadius: '12px',
                   padding: '12px',
                }
             };
          }
          if (n.id === 'escalation') {
             return {
                ...n,
                style: { background: '#212936', color: '#D1D5DB', border: '2px solid #EF4444', borderRadius: '12px', padding: '12px' }
             };
          }
          return {
             ...n,
             style: { background: '#212936', color: '#D1D5DB', border: '1px solid #374151', borderRadius: '12px', padding: '12px' }
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-64 w-full bg-lightBg dark:bg-darkBg border border-borderLight dark:border-borderDark rounded-2xl overflow-hidden shadow-sm relative">
      <div className="absolute top-4 left-4 z-10 text-sm font-semibold tracking-wider text-gray-500 uppercase">Agentic Workflow Monitor</div>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background gap={16} size={1} color="#64748b" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
