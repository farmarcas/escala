import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { DemoRoleProvider } from '@/features/demo-role';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado em index.html');

createRoot(root).render(
  <StrictMode>
    <DemoRoleProvider>
      <RouterProvider router={router} />
    </DemoRoleProvider>
  </StrictMode>,
);
