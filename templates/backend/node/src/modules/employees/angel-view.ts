// Anjo como aparece no grupo, nas lojas e na página da loja (spec 005, R9): as chaves de antes,
// agora vindas da ocupação e do celular (ou do fixo, se não houver celular).
export const ANGEL_SELECT = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  landline: true,
  occupation: { select: { name: true } },
} as const;

export type AngelView = {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string | null;
};

export const toAngelView = (row: {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  landline: string | null;
  occupation: { name: string };
}): AngelView => ({
  id: row.id,
  name: row.name,
  jobTitle: row.occupation.name,
  email: row.email,
  phone: row.mobile ?? row.landline,
});
