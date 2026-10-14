import HomePage from '@/components/site/home-page';
import { getHomepageData } from '@/lib/db-site-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const initialData = await getHomepageData();
  const serialized = initialData ? JSON.parse(JSON.stringify(initialData)) : null;
  return <HomePage initialData={serialized} />;
}
