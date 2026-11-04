import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';

// Configurações é só do administrador (specs/004, FR-002); a API também recusa.
export function NoAccess() {
  return (
    <Card>
      <EmptyState
        title="Você não tem acesso a esta área"
        description="Configurações é exclusiva dos administradores da plataforma."
      />
    </Card>
  );
}
