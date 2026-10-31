// Contato principal do parceiro (no máximo um). O primeiro contato vira principal sozinho;
// marcar outro como principal tira o anterior (spec 003, FR-031).
export const shouldBePrimary = (
  requested: boolean | undefined,
  partnerHasPrimary: boolean,
): boolean => requested ?? !partnerHasPrimary;

// Contato precisa de e-mail ou telefone, também depois de uma edição parcial.
export const hasReach = (contact: { email: string | null; phone: string | null }): boolean =>
  Boolean(contact.email || contact.phone);
