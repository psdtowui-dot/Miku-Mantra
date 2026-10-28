import HomePage from '@/components/site/home-page';
import { getHomepageData } from '@/lib/db-site-settings';
import ReactDOM from 'react-dom';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const initialData = await getHomepageData();
  const serialized = initialData ? JSON.parse(JSON.stringify(initialData)) : null;

  const firstHeroImg = serialized?.banners?.[0]?.img;
  if (firstHeroImg && typeof firstHeroImg === 'string' && !firstHeroImg.startsWith('data:')) {
    ReactDOM.preload(firstHeroImg, { as: 'image', fetchPriority: 'high' });
  }

  return <HomePage initialData={serialized} />;
}
