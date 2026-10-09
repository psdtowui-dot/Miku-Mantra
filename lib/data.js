// Server-side data helpers — fetch from API/DB with fallback to seed data
import { PRODUCTS as SEED, CATEGORIES as SEED_C, COLLECTIONS as SEED_K, slugify } from './products'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''

export async function fetchProducts(params={}){
  try {
    const q = new URLSearchParams(params).toString()
    const r = await fetch(`${BASE}/api/products${q?'?'+q:''}`, { cache:'no-store' })
    if(!r.ok) throw new Error('failed')
    const d = await r.json()
    return d.products || []
  } catch { return SEED }
}
export async function fetchProduct(slug){
  try {
    const r = await fetch(`${BASE}/api/products/${slug}`, { cache:'no-store' })
    if(!r.ok) throw new Error('failed')
    return await r.json()
  } catch {
    const cleanSlug = slugify(slug);
    const p = SEED.find(x => x.slug === slug || x.slug === cleanSlug || x.id === slug);
    return { product: p, related: SEED.filter(x => x.category === p?.category && x.id !== p?.id).slice(0,4) };
  }
}
export async function fetchBanners(){
  try { const r = await fetch(`${BASE}/api/banners`, { cache:'no-store' }); if(!r.ok) throw 0; const d = await r.json(); return d.banners||[] } catch { return [] }
}
