'use client';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const AIChat = dynamic(() => import('./ai-chat'), { ssr: false });

export default function AIChatMount(){
  const path = usePathname() || '';
  if (path.startsWith('/admin')) return null;
  return <AIChat />;
}
