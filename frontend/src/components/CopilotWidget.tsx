import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Sparkles, AlertTriangle, Info, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { queryCopilot, CopilotResponse, CopilotItem } from '../api/api';

type Message = {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  type?: 'INFO' | 'ALERTE' | 'RECOMMANDATION' | 'RAPPORT';
  items?: CopilotItem[];
  suggestion?: string | null;
  timestamp: Date;
};

export const CopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createWelcomeMessage = (): Message => ({
    id: 'welcome',
    sender: 'copilot',
    text: 'Bonjour ! Je suis PATRIS Copilot, votre analyste patrimonial intelligent. Je peux etablir un diagnostic executif, anticiper les risques, proposer un budget de renouvellement et recommander les actions prioritaires.',
    items: [
      { label: 'Diagnostic executif', value: 'Fais-moi un diagnostic executif du patrimoine', badge: 'info' },
      { label: 'Risques a 90 jours', value: 'Quels risques dans les 90 prochains jours ?', badge: 'warning' },
      { label: 'Plan action priorise', value: 'Quelles actions dois-je prioriser ?', badge: 'success' },
      { label: 'Budget renouvellement', value: 'Quel plan de renouvellement recommandes-tu ?', badge: 'info' },
      { label: 'Stocks critiques', value: 'Quels consommables sont en rupture ?', badge: 'danger' }
    ],
    timestamp: new Date()
  });

  useEffect(() => {
    const saved = localStorage.getItem('patris_copilot_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        return;
      } catch (e) {}
    }
    setMessages([createWelcomeMessage()]);
  }, []);

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('patris_copilot_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryCopilot(textToSend);
      const copilotMsg: Message = {
        id: Math.random().toString(),
        sender: 'copilot',
        text: res.answer,
        type: res.type,
        items: res.items,
        suggestion: res.suggestion,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, copilotMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: 'copilot',
        text: 'Desole, je rencontre des difficultes pour me connecter au serveur ou analyser les donnees. Veuillez reessayer dans quelques instants.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('patris_copilot_history');
    setMessages([createWelcomeMessage()]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className="copilot-fab"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={22} /> : <Bot size={22} />}
        <span className="fab-pulse" />
      </motion.button>

      {/* Chat Interface Side-Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="copilot-drawer"
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="copilot-header">
              <div className="copilot-title-wrapper">
                <div className="copilot-avatar">
                  <Sparkles size={18} className="sparkles-anim" />
                </div>
                <div>
                  <h4>PATRIS Copilot</h4>
                  <p>Assistant Intelligent ERP</p>
                </div>
              </div>
              <div className="header-actions">
                <button onClick={clearHistory} className="clear-btn" title="Effacer l'historique">
                  Réinitialiser
                </button>
                <button onClick={() => setIsOpen(false)} className="close-drawer-btn">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="copilot-messages-container">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble-wrapper ${msg.sender}`}>
                  <div className={`message-bubble ${msg.sender}`}>
                    <p className="message-text">{msg.text}</p>
                    
                    {/* Rich items visualization */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="message-items-list">
                        {msg.items.map((item, idx) => (
                          <motion.div
                            key={idx}
                            className="message-item-card"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => msg.id === 'welcome' || msg.text.includes(' formulations') || item.value.includes('?') || item.value.toLowerCase().includes('diagnostic') ? handleSend(item.value) : null}
                            style={{ cursor: (msg.id === 'welcome' || msg.text.includes(' formulations') || item.value.includes('?') || item.value.toLowerCase().includes('diagnostic')) ? 'pointer' : 'default' }}
                          >
                            <div className="item-card-left">
                              <span className="item-label">{item.label}</span>
                              {item.value && msg.id !== 'welcome' && !msg.text.includes(' formulations') && (
                                <span className="item-value">{item.value}</span>
                              )}
                            </div>
                            <span className={`badge badge-${item.badge}`}>
                              {item.badge === 'danger' && <AlertTriangle size={10} />}
                              {item.badge === 'warning' && <AlertTriangle size={10} />}
                              {item.badge === 'success' && <CheckCircle2 size={10} />}
                              {item.badge === 'info' && <Info size={10} />}
                              {item.badge}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.suggestion && (
                      <button
                        onClick={() => handleSend(msg.suggestion!)}
                        className="suggestion-btn"
                      >
                        <ChevronRight size={12} /> {msg.suggestion}
                      </button>
                    )}
                  </div>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              
              {loading && (
                <div className="message-bubble-wrapper copilot">
                  <div className="message-bubble copilot typing-bubble">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="copilot-input-form"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question sur le parc..."
                className="copilot-input"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="copilot-send-btn"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .copilot-fab {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          border: none;
          box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          outline: none;
        }

        .fab-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 32px;
          border: 2px solid #6366f1;
          opacity: 0.4;
          animation: fabPulse 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }

        @keyframes fabPulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          100% { transform: scale(1.15); opacity: 0; }
        }

        .copilot-drawer {
          position: fixed;
          top: 20px;
          right: 20px;
          bottom: 20px;
          width: 380px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .copilot-header {
          padding: 20px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.5);
        }

        .copilot-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .copilot-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sparkles-anim {
          animation: sparklesGlow 3s ease-in-out infinite;
        }

        @keyframes sparklesGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        .copilot-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        .copilot-header p {
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .clear-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          color: #0f172a;
          background: rgba(0, 0, 0, 0.05);
        }

        .close-drawer-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
        }

        .close-drawer-btn:hover {
          color: #0f172a;
        }

        .copilot-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 85%;
        }

        .message-bubble-wrapper.user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .message-bubble-wrapper.copilot {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.5;
        }

        .message-bubble.user {
          background: #4f46e5;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message-bubble.copilot {
          background: white;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .message-text {
          margin: 0;
          white-space: pre-wrap;
        }

        .message-time {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 700;
          margin-top: 4px;
        }

        .message-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          width: 100%;
        }

        .message-item-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s;
        }

        .item-card-left {
          display: flex;
          flex-direction: column;
        }

        .item-label {
          font-weight: 700;
          color: #334155;
          font-size: 11px;
        }

        .item-value {
          color: #64748b;
          font-size: 10px;
          margin-top: 2px;
        }

        .badge {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .badge-danger { background: #fee2e2; color: #ef4444; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-success { background: #d1fae5; color: #10b981; }
        .badge-info { background: #e0f2fe; color: #0ea5e9; }

        .suggestion-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          margin-top: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .suggestion-btn:hover {
          background: #e0e7ff;
          border-color: #c7d2fe;
        }

        .copilot-input-form {
          padding: 15px;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          gap: 10px;
          background: rgba(255, 255, 255, 0.5);
        }

        .copilot-input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }

        .copilot-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
        }

        .copilot-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #4f46e5;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .copilot-send-btn:hover {
          background: #4338ca;
        }

        .copilot-send-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        /* Typing Indicator */
        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
        }

        .typing-bubble .dot {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 3px;
          animation: typingDot 1.4s infinite ease-in-out;
        }

        .typing-bubble .dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-bubble .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingDot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
};
