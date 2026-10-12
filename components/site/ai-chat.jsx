'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, MessageCircle } from 'lucide-react';
import { useAuth, authFetch } from '@/lib/use-auth';

const SUGGESTIONS = [
  'Recommend a bridal necklace under ₹5L',
  'How do I clean 22K gold?',
  'How to measure my ring size at home?',
  'Best daily-wear gold chain for men',
  'Diamond vs polki — what should I pick?',
];

function uuid(){
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'mm-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function renderText(t){
  // Very light markdown: **bold**, product links /product/slug, bullets
  const parts = t.split(/(\*\*[^*]+\*\*|\/product\/[a-z0-9-]+)/gi);
  return parts.map((chunk, i) => {
    if (/^\*\*[^*]+\*\*$/.test(chunk)) return <strong key={i}>{chunk.slice(2, -2)}</strong>;
    if (/^\/product\/[a-z0-9-]+$/i.test(chunk)) return <a key={i} href={chunk} className="text-[#9C6B30] underline decoration-[#D4AF37]/50 hover:decoration-[#9C6B30]">{chunk}</a>;
    return <span key={i}>{chunk}</span>;
  });
}

export default function AIChat(){
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const chatKey = user?.id ? `mikumantra_chat_sid_${user.id}` : 'mikumantra_chat_sid_guest';
    let id = typeof window !== 'undefined' ? localStorage.getItem(chatKey) : '';
    if (!id) { id = uuid(); if (typeof window !== 'undefined') localStorage.setItem(chatKey, id); }
    setSessionId(id);
  }, [user]);

  useEffect(() => {
    if (open && !greeted) {
      setMessages([{ role: 'model', content: "Namaste, I'm **MikuMantra**, your personal jewellery concierge. Ask me about our collection, care tips, sizing, or gifting — I'm here to help." }]);
      setGreeted(true);
    }
  }, [open, greeted]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, sending]);

  async function send(text){
    const q = (text ?? input).trim();
    if (!q || sending) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: q }]);
    setSending(true);
    try {
      const r = await authFetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, message: q }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to reach the concierge');
      setMessages(m => [...m, { role: 'model', content: d.reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'model', content: 'The concierge is briefly unavailable. Please try again in a moment.' }]);
    } finally { setSending(false); }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI jewellery assistant"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] group"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#9C6B30] to-[#D4AF37] blur-lg opacity-60 group-hover:opacity-90 transition-opacity"/>
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#9C6B30] to-[#D4AF37] text-white flex items-center justify-center shadow-xl border border-white/20 hover:scale-105 transition-transform">
            {open ? <X size={20}/> : <Sparkles size={20}/>}
          </div>
          {!open && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"><span className="w-1.5 h-1.5 bg-[#9C6B30] rounded-full animate-pulse"/></span>}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-18 sm:bottom-24 right-3 sm:right-6 z-[60] w-[calc(100vw-1.5rem)] sm:w-[400px] h-[520px] sm:h-[560px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl border border-[#E8E8E8] shadow-[0_30px_80px_-20px_rgba(26,26,26,0.25)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2a2018] text-white px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9C6B30] to-[#D4AF37] flex items-center justify-center"><Sparkles size={18}/></div>
              <div className="flex-1">
                <div className="font-display text-lg leading-tight">MikuMantra Concierge</div>
                <div className="text-[10px] tracking-widest uppercase text-[#D4AF37] flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"/> Online · Powered by AI</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white"><X size={18}/></button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAF6EF]/30">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#1A1A1A] text-white rounded-br-sm' : 'bg-white border border-[#E8E8E8] text-[#333] rounded-bl-sm'}`}>
                    {m.role === 'model' ? renderText(m.content) : m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start"><div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E8E8E8]"><div className="flex gap-1.5"><span className="w-2 h-2 bg-[#9C6B30] rounded-full animate-bounce" style={{animationDelay:'0ms'}}/><span className="w-2 h-2 bg-[#9C6B30] rounded-full animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-2 h-2 bg-[#9C6B30] rounded-full animate-bounce" style={{animationDelay:'300ms'}}/></div></div></div>
              )}
            </div>

            {/* Suggestions (only before user types anything) */}
            {messages.length <= 1 && !sending && (
              <div className="px-4 py-3 border-t border-[#E8E8E8] bg-white">
                <div className="text-[9px] tracking-widest uppercase text-neutral-400 mb-2">Try asking</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 border border-[#E8E8E8] rounded-full hover:border-[#9C6B30] hover:text-[#9C6B30] transition text-neutral-600">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-[#E8E8E8] bg-white p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about jewellery, care, sizing…"
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-[#FAF6EF]/50 border border-transparent rounded-full text-sm focus:outline-none focus:border-[#9C6B30] focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#9C6B30] to-[#D4AF37] text-white flex items-center justify-center disabled:opacity-40 hover:scale-105 transition"
              >
                {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
              </button>
            </form>
            <div className="text-[9px] text-center py-1.5 text-neutral-400 bg-white tracking-widest uppercase">MikuMantra AI · Powered by Google Gemini</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
