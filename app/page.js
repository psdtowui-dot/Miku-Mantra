import HomePage from '@/components/site/home-page';
import { getHomepageData } from '@/lib/db-site-settings';
import { optimizeImageUrl } from '@/lib/image-utils';
import ReactDOM from 'react-dom';

export const revalidate = 60;

export default async function Page() {
  const initialData = await getHomepageData();
  const serialized = initialData ? JSON.parse(JSON.stringify(initialData)) : null;

  const rawFirstHeroImg = serialized?.banners?.[0]?.img;
  if (rawFirstHeroImg && typeof rawFirstHeroImg === 'string' && !rawFirstHeroImg.startsWith('data:')) {
    const firstHeroImg = optimizeImageUrl(rawFirstHeroImg, { width: 1920, quality: 80 });
    ReactDOM.preload(firstHeroImg, { as: 'image', fetchPriority: 'high' });
  }

  return <HomePage initialData={serialized} />;
}
