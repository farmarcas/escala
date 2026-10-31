export type EmployeeArea =
  'COMMERCIAL' | 'MEMBER_FINANCE' | 'TRADE' | 'DIGITAL_PRODUCTS' | 'MEMBER_SUCCESS' | 'OPERATIONS';

export type EmployeeAccessRole = 'PLATFORM_ADMIN' | 'PLATFORM_ANALYST' | 'NONE';

export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';

export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  area: EmployeeArea;
  jobTitle: string;
  accessRole: EmployeeAccessRole;
  status: EmployeeStatus;
  terminatedAt: string | null;
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
  phone: string | null;
  area: EmployeeArea;
  jobTitle: string;
  accessRole: EmployeeAccessRole;
};

export type EmployeeStatusAction = 'terminate' | 'rehire';
