'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/site/product-card';
import { useWishlist } from '@/lib/cart-store';
import { useAuth } from '@/lib/use-auth';
import { PRODUCTS } from '@/lib/products';
import { Heart, Loader2 } from 'lucide-react';

export default function WishlistPage(){
  const { user, loading: authLoading } = useAuth();
  const { ids } = useWishlist();
  const router = useRouter();
  const [productsList, setProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/wishlist');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const r = await fetch('/api/products', { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d.products)) setProductsList(d.products);
        }
      } catch (e) {
        console.error('Failed to load wishlist products:', e);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  if (authLoading || !user || loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#9C6B30]" size={36} />
      </div>
    );
  }

  const allProducts = productsList.length > 0 ? productsList : PRODUCTS;
  const items = allProducts.filter(p=>ids.includes(p.id));
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-8 sm:mb-10">
          <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">Saved for later</div>
          <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-[#1A1A1A] break-words">Your Wishlist</h1>
          <div className="gold-line w-16 mx-auto my-4"/>
        </div>
        {items.length===0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-4"><Heart size={28}/></div>
            <div className="font-serif-luxe text-lg sm:text-xl text-neutral-500">No treasures saved yet.</div>
            <Link href="/shop" className="inline-block mt-6 border-b border-[#9C6B30] text-[#9C6B30] pb-1 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase">Discover the Collection</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-6 md:gap-8">{items.map((p,i)=><ProductCard key={p.id} p={p} index={i}/>)}</div>
        )}
      </div>
    </main>
  );
}
