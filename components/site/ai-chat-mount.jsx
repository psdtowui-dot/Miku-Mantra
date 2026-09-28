'use client';
import { usePathname } from 'next/navigation';
import AIChat from './ai-chat';

export default function AIChatMount(){
  const path = usePathname() || '';
  if (path.startsWith('/admin')) return null;
  return <AIChat />;
}
