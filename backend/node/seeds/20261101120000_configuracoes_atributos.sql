-- Configurações, etapa 1 (specs/004): ícone e autosserviço dos mobiliários de exemplo e o uso no
-- Escala das estratégias. FICTÍCIO, só local/dev. Idempotente: só mexe em item que ninguém alterou
-- em Configurações (version = 1), para não desfazer o que o administrador mudou.
BEGIN;

UPDATE catalog_items AS item
SET icon = seed.icon,
    self_service = seed.self_service
FROM (VALUES
  ('49959858-bb4a-5f97-a337-3ee1b59d82ac'::uuid, 'shelving', true),
  ('e1d79488-1a5d-5e91-8404-467fbce82af2'::uuid, 'shelf-end', true),
  ('d403c038-7c59-53eb-a390-aaad0f3ca8b1'::uuid, 'scan-barcode', false),
  ('395c7248-e636-5b38-947d-8ca9ea5a6066'::uuid, 'impulse', false),
  ('96c24826-0df4-5d70-9aa0-ad12cc49dc89'::uuid, 'counter', false),
  ('77de4ef9-8b3b-5fe7-854c-d894323df19d'::uuid, 'display-stand', false),
  ('27a5e8d4-f378-5ce3-8de7-3c6d0b171060'::uuid, 'refrigerator', false),
  ('cd381a1f-556a-502a-a3f6-a6be43617954'::uuid, 'cooler-drink', false),
  ('6608a928-e282-5127-b374-655ff75481b5'::uuid, 'sparkles', true),
  ('cb71a545-69ca-5c45-ae58-9ce42f82ba19'::uuid, 'island', true),
  ('4d71af9d-bd15-5c3d-ba8b-ea90f199d418'::uuid, 'stethoscope', false),
  ('c45bc928-4ac8-55f8-84cf-4195d0f70066'::uuid, 'monitor', false)
) AS seed (id, icon, self_service)
WHERE item.id = seed.id AND item.version = 1;

UPDATE catalog_items
SET used_by_scale = true,
    description = 'Abrir mais horas ou dias'
WHERE id = '81dc5e07-10e9-5131-b2fa-78beb2b2a26b'
  AND version = 1;

COMMIT;
