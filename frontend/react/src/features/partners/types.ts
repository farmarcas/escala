export type PartnerType = 'INDUSTRY' | 'DISTRIBUTOR';
export type PartnerStatus = 'ACTIVE' | 'INACTIVE';

export type Contact = {
  id: string;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

export type Partner = {
  id: string;
  type: PartnerType;
  cnpj: string;
  legalName: string;
  tradeName: string;
  status: PartnerStatus;
  primaryContact: Contact | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerDetail = Partner & { contacts: Contact[] };

export type PartnerStats = {
  active: number;
  industries: number;
  distributors: number;
  withoutPrimaryContact: number;
  byType: { all: number; industry: number; distributor: number };
};

export type PartnerInput = {
  type: PartnerType;
  cnpj: string;
  legalName: string;
  tradeName: string;
};

export type ContactInput = {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary?: boolean;
};

export type PartnerStatusAction = 'inactivate' | 'reactivate';
