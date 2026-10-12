'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './use-auth';

const MAX_COMPARE = 4;
const MAX_RECENT  = 12;

const getCompareKey = (u) => u?.id ? `mikumantra_compare_${u.id}` : 'mikumantra_compare_guest';
const getRecentKey  = (u) => u?.id ? `mikumantra_recent_${u.id}` : 'mikumantra_recent_guest';

function read(k){ if(typeof window==='undefined') return []; try{ return JSON.parse(localStorage.getItem(k)||'[]'); }catch{ return []; } }
function write(k,v){ if(typeof window==='undefined') return; localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent('mikumantra:store')); }

export function useCompare(){
  const { user } = useAuth();
  const [ids, setIds] = useState([]);
  const k = getCompareKey(user);

  useEffect(() => { 
    setIds(read(getCompareKey(user))); 
    const h = () => setIds(read(getCompareKey(user))); 
    window.addEventListener('mikumantra:store', h); 
    return () => { window.removeEventListener('mikumantra:store', h); }; 
  }, [user]);

  const has = (id) => ids.includes(id);

  const toggle = useCallback((id) => {
    const curKey = getCompareKey(user);
    const cur = read(curKey);
    if (cur.includes(id)) { 
      write(curKey, cur.filter(x => x !== id)); 
      return { added: false }; 
    }
    if (cur.length >= MAX_COMPARE) return { added: false, full: true };
    write(curKey, [...cur, id]); 
    return { added: true };
  }, [user]);

  const clear = useCallback(() => write(getCompareKey(user), []), [user]);

  return { ids, has, toggle, clear, count: ids.length, MAX: MAX_COMPARE };
}

export function useRecentlyViewed(){
  const { user } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => { 
    setIds(read(getRecentKey(user))); 
    const h = () => setIds(read(getRecentKey(user))); 
    window.addEventListener('mikumantra:store', h); 
    return () => { window.removeEventListener('mikumantra:store', h); }; 
  }, [user]);

  const push = useCallback((id) => {
    if (!id) return;
    const curKey = getRecentKey(user);
    const cur = read(curKey).filter(x => x !== id);
    cur.unshift(id);
    write(curKey, cur.slice(0, MAX_RECENT));
  }, [user]);

  return { ids, push };
}

