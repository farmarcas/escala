-- Dados de exemplo FICTÍCIOS: Cartão Alelo do Grupo Aurora Norte (spec 003, US6). Só local/dev.
-- Titular, CPF e número inventados (CPF de teste com dígito válido). Um cartão por grupo:
-- ON CONFLICT DO NOTHING não sobrescreve o que foi mudado na tela.
BEGIN;

INSERT INTO group_benefit_cards (id, economic_group_id, store_id, holder_name, holder_cpf, holder_birth_date,
                                 holder_pseudonym, card_number, created_at, updated_at)
SELECT 'c2b8a3c4-5d6e-5f70-8a1b-2c3d4e5f6a7b', g.id, s.id, 'Carla Mendonça', '52998224725', date '1980-05-20',
       'F-AL417', '6062825624254001', timestamptz '2026-08-02 10:00:00-03', timestamptz '2026-08-02 10:00:00-03'
  FROM economic_groups g
  JOIN stores s ON s.economic_group_id = g.id AND s.code = 2 AND s.deleted_at IS NULL
 WHERE g.number = 417
ON CONFLICT DO NOTHING;

COMMIT;
