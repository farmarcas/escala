export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';
export type EmployeeGender = 'FEMALE' | 'MALE' | 'OTHER' | 'UNDISCLOSED';
export type SuiteSystem = 'BACKOFFICE' | 'GESTAO_360' | 'ESCALA';
export type SuiteRole = 'ADMIN' | 'MANAGER' | 'ANALYST';

// Departamento e ocupação vêm das listas de Configurações (spec 005).
export type ListItem = { id: string; name: string; active: boolean };

export type EmployeeAccess = {
  system: SuiteSystem;
  role: SuiteRole;
  grantedAt: string;
  grantedBy: string;
  revokedAt: string | null;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  gender: EmployeeGender | null;
  mobile: string | null;
  landline: string | null;
  department: ListItem;
  occupation: ListItem;
  status: EmployeeStatus;
  terminatedAt: string | null;
  version: number;
  // Ativo: acessos vigentes. Desligado: os encerrados no desligamento.
  accesses: EmployeeAccess[];
  // Grupos fora do arquivo que a pessoa acompanha como Anjo.
  portfolioCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioGroup = { number: number; name: string; status: string; storeCount: number };

export type EmployeeDetail = Employee & { portfolio: PortfolioGroup[] };

export type EmployeeStats = {
  active: number;
  angels: number;
  angelGroups: number;
  groupsWithoutAngel: number;
  admins: number;
};

export type EmployeeInput = {
  name: string;
  email: string;
  gender: EmployeeGender | null;
  mobile: string;
  landline: string | null;
  departmentId: string;
  occupationId: string;
};

export type EmployeeStatusAction = 'terminate' | 'rehire';

// Listas e regras de acesso (GET /employees/options).
export type EmployeeOptions = {
  departments: { id: string; name: string }[];
  occupations: { id: string; name: string }[];
  systems: { system: SuiteSystem; label: string; isLive: boolean; description: string }[];
  roles: {
    role: SuiteRole;
    label: string;
    rules: { BACKOFFICE: string[]; default: string[] };
  }[];
};
