import HomePage from '@/components/site/home-page';
import { getHomepageData } from '@/lib/db-site-settings';

export default async function Page() {
  const initialData = await getHomepageData();
  return <HomePage initialData={initialData} />;
}
