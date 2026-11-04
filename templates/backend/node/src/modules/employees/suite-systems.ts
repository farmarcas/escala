import type { SuiteRole, SuiteSystem } from '../../generated/prisma/client.js';

// Sistemas (módulos) da Suite em que um funcionário da Farmarcas pode ter acesso (spec 005).
// Todo módulo novo da Suite entra aqui (e no enum suite_system), para aparecer na aba Sistemas e
// acesso do perfil do funcionário. Os que ainda não estão no ar guardam o acesso, que passa a
// valer quando o sistema entrar.
export const SUITE_SYSTEMS: {
  system: SuiteSystem;
  label: string;
  isLive: boolean;
  description: string;
}[] = [
  {
    system: 'BACKOFFICE',
    label: 'Backoffice',
    isLive: true,
    description: 'Cadastro de grupos, lojas, marcas, parceiros e funcionários',
  },
  {
    system: 'GESTAO_360',
    label: 'Gestão 360',
    isLive: false,
    description: 'Chamados e planos de ação dos grupos',
  },
  {
    system: 'ESCALA',
    label: 'Escala',
    isLive: false,
    description: 'Escala de horários e equipes das lojas',
  },
];

export const SUITE_ROLE_ORDER: SuiteRole[] = ['ADMIN', 'MANAGER', 'ANALYST'];

export const ROLE_LABEL: Record<SuiteRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  ANALYST: 'Analista',
};

export const systemLabel = (system: SuiteSystem) =>
  SUITE_SYSTEMS.find((item) => item.system === system)?.label ?? system;

// O que cada papel permite: no Backoffice (tabela da spec) e a regra geral dos outros sistemas.
export const SUITE_ROLES: {
  role: SuiteRole;
  label: string;
  rules: { BACKOFFICE: string[]; default: string[] };
}[] = [
  {
    role: 'ADMIN',
    label: ROLE_LABEL.ADMIN,
    rules: {
      BACKOFFICE: [
        'Tudo o que o gestor faz',
        'Cadastrar, alterar, desligar e religar funcionários',
        'Dar e tirar acesso aos sistemas',
        'Configurações (listas e atributos)',
      ],
      default: ['Faz tudo no sistema', 'Configurações do sistema', 'Quem tem acesso ao sistema'],
    },
  },
  {
    role: 'MANAGER',
    label: ROLE_LABEL.MANAGER,
    rules: {
      BACKOFFICE: [
        'Cadastrar e alterar grupos, lojas, marcas e parceiros',
        'Definir Anjo, etapa, bloqueio, titularidade e Cartão Alelo',
        'Corrigir dados da loja e decidir solicitações',
        'Ver dados pessoais do proprietário',
        'Sem Configurações, funcionários e acessos',
      ],
      default: ['Cadastra, altera, decide e aprova', 'Sem configurações e sem dar acessos'],
    },
  },
  {
    role: 'ANALYST',
    label: ROLE_LABEL.ANALYST,
    rules: {
      BACKOFFICE: [
        'Consultar tudo e exportar listas',
        'Dados pessoais do proprietário mascarados',
        'Não altera cadastros',
      ],
      default: ['Consulta e acompanha', 'Não altera cadastros'],
    },
  },
];
