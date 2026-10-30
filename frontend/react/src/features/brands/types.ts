export type BrandStatus = 'ACTIVE' | 'HISTORICAL';

export type Brand = {
  id: string;
  name: string;
  status: BrandStatus;
  storeCount: number;
  groupCount: number;
  createdAt: string;
};

export type BrandStats = { active: number; historical: number; withoutStores: number };
