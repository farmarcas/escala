import { PageBody } from '@/components/layout/PageHeader';
import { HomeView } from '@/features/home';

export function HomePage() {
  return (
    <PageBody>
      <h1 className="sr-only">Início</h1>
      <HomeView />
    </PageBody>
  );
}
