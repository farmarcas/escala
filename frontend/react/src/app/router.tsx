import { createBrowserRouter } from 'react-router-dom';
import { formatGroupNumber, formatStoreCode } from '@/lib/format';
import { BrandsPage } from './BrandsPage';
import { GroupDetailPage } from './GroupDetailPage';
import { GroupsPage } from './GroupsPage';
import { NotFoundPage } from './NotFoundPage';
import { OverviewPage } from './OverviewPage';
import { RootLayout, type RouteHandle } from './RootLayout';
import { StorePage } from './StorePage';
import { StoresPage } from './StoresPage';
import { TenantLayout } from './tenant/TenantLayout';
import { TenantStorePage } from './tenant/TenantStorePage';
import { TenantStoresPage } from './tenant/TenantStoresPage';

const handle = (crumbs: RouteHandle['crumbs']): RouteHandle => ({ crumbs });

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <OverviewPage />, handle: handle(() => [{ label: 'Visão geral' }]) },
      {
        path: '/grupos',
        element: <GroupsPage />,
        handle: handle(() => [{ label: 'Grupos econômicos' }]),
      },
      {
        path: '/grupos/:numero',
        element: <GroupDetailPage />,
        handle: handle((params) => [
          { label: 'Grupos econômicos', to: '/grupos' },
          { label: `GE ${formatGroupNumber(Number(params.numero))}` },
        ]),
      },
      { path: '/lojas', element: <StoresPage />, handle: handle(() => [{ label: 'Lojas' }]) },
      {
        path: '/lojas/:codigo',
        element: <StorePage />,
        handle: handle((params) => [
          { label: 'Lojas', to: '/lojas' },
          { label: formatStoreCode(Number(params.codigo)) },
        ]),
      },
      {
        path: '/marcas',
        element: <BrandsPage />,
        handle: handle(() => [{ label: 'Marcas Farmarcas' }]),
      },
      {
        path: '*',
        element: <NotFoundPage />,
        handle: handle(() => [{ label: 'Página não encontrada' }]),
      },
    ],
  },
  {
    // Área do grupo econômico (tenant): mesma página da loja, pelo caminho do grupo.
    path: '/grupo',
    element: <TenantLayout />,
    children: [
      {
        path: 'lojas',
        element: <TenantStoresPage />,
        handle: handle(() => [{ label: 'Minhas lojas' }]),
      },
      {
        path: 'lojas/:codigo',
        element: <TenantStorePage />,
        handle: handle((params) => [
          { label: 'Minhas lojas', to: '/grupo/lojas' },
          { label: formatStoreCode(Number(params.codigo)) },
        ]),
      },
    ],
  },
]);
