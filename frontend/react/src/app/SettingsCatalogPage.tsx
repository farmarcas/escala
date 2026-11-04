import { useParams } from 'react-router-dom';
import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { CatalogListView, NoAccess, listOf } from '@/features/settings';
import { NotFoundPage } from './NotFoundPage';

export function SettingsCatalogPage() {
  const { isAdmin } = useDemoRole();
  const list = listOf(useParams().lista);
  if (!list) return <NotFoundPage />;
  return (
    <PageBody>{isAdmin ? <CatalogListView key={list.slug} list={list} /> : <NoAccess />}</PageBody>
  );
}
