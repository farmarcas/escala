-- Catálogos de ferramentas externas (com condição negociada pela Farmarcas, valores de
-- exemplo a validar) e de canais, e respostas de exemplo da LJ-002. FICTÍCIO, só local/dev.
BEGIN;

INSERT INTO catalog_items (id, kind, name, group_label, description, negotiated_monthly_cents, sort) VALUES
  ('7a755119-d8a2-557d-968c-458fa27b20da', 'EXTERNAL_TOOL', 'Imendes', 'Fiscal e tributário', NULL, NULL, 0),
  ('a0e68250-b9bf-5982-a741-85a98a9b4025', 'EXTERNAL_TOOL', 'Concil', 'Conciliação de cartões', NULL, NULL, 1),
  ('c901b0a3-a76c-5e06-895a-6bc1c272d128', 'EXTERNAL_TOOL', 'Sistema Financeiro Avançado', 'Financeiro', NULL, NULL, 2),
  ('ecc60e64-6433-5b89-ad50-88e3637982fb', 'EXTERNAL_TOOL', 'Confear', NULL, NULL, NULL, 3),
  ('7c2673a8-4389-55f4-a408-965e21b8e4f3', 'EXTERNAL_TOOL', 'Proffer', NULL, NULL, NULL, 4),
  ('0d4d7742-86a7-5e06-964c-2a992bb0cf36', 'EXTERNAL_TOOL', 'Infoprice', 'Pesquisa de preços', 'Condição negociada pela Farmarcas · valor de exemplo', 49000, 5),
  ('ac3c32ef-c6ed-54a1-873d-30b940e0dd9c', 'EXTERNAL_TOOL', 'Myseer', NULL, NULL, NULL, 6),
  ('f6fd21d0-2cbd-5450-9315-b4b5e389759a', 'EXTERNAL_TOOL', 'Cotefácil', 'Cotação de compras', 'Plano sem mensalidade para associados · exemplo', 0, 7),
  ('c4614374-3d51-52f8-b3bd-dc27ec2176e3', 'EXTERNAL_TOOL', 'Dotte.ponto', 'Ponto eletrônico', NULL, NULL, 8),
  ('32dbff0e-6bcd-59d0-bb81-b46f66a143db', 'EXTERNAL_TOOL', 'Trivio', NULL, NULL, NULL, 9),
  ('362adaac-d859-5e40-b0a0-d0ecff6df87e', 'EXTERNAL_TOOL', 'Solides', 'Gestão de pessoas', 'Condição negociada pela Farmarcas · valor de exemplo', 35000, 10),
  ('adb55a4a-b177-5975-927b-f758e3daf002', 'EXTERNAL_TOOL', 'Performa 7', NULL, NULL, NULL, 11),
  ('e22b8c74-4910-5c81-a963-3632e0bdf39e', 'EXTERNAL_TOOL', 'Web Jasper', NULL, NULL, NULL, 12),
  ('7ee7d6c0-8f2c-5c0b-9480-650a44a8a169', 'EXTERNAL_TOOL', 'Scanntech', NULL, NULL, NULL, 13),
  ('c8ec18eb-976d-55ad-8d44-55a5aff80223', 'EXTERNAL_TOOL', 'Único', NULL, NULL, NULL, 14),
  ('12a5d40a-a190-5389-abf5-2f8a66d2a390', 'CHANNEL', 'Aplicativo', 'prop', 'Nome do app ou link na loja de apps', NULL, 0),
  ('e9db279e-25ac-5541-816c-53735fd1253d', 'CHANNEL', 'Webcommerce', 'prop', 'Endereço do site', NULL, 1),
  ('edc295f7-6afc-5015-8103-12237cf1ffd8', 'CHANNEL', 'WhatsApp', 'terc', 'Número de atendimento', NULL, 2),
  ('b826b99d-ac3f-5fbe-bccd-6a51184adc13', 'CHANNEL', 'Instagram', 'terc', 'Perfil', NULL, 3),
  ('69e50651-9c2f-5633-9082-7a0a7acf949a', 'CHANNEL', 'iFood', 'terc', 'Nome da loja no iFood', NULL, 4),
  ('94b6dafa-f996-5daf-92a4-74ba22f6dd44', 'CHANNEL', 'Mercado Livre', 'terc', 'Nome da loja no Mercado Livre', NULL, 5),
  ('8301633e-4b8f-5857-8e5d-ea983d2ec7b4', 'CHANNEL', 'Shopee', 'terc', 'Nome da loja na Shopee', NULL, 6),
  ('a9a0fca2-543e-5cac-af05-b7b6d9438e65', 'CHANNEL', 'Rappi', 'terc', 'Nome da loja na Rappi', NULL, 7)
ON CONFLICT DO NOTHING;

INSERT INTO store_catalog_entries (id, store_id, catalog_item_id, uses, identifier, monthly_cost_cents, updated_at) VALUES
  ('bf816cd9-42b4-5eb6-9f95-c2be012cf631', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '7a755119-d8a2-557d-968c-458fa27b20da', true, NULL, 38000, now()),
  ('c5aa98bc-6e6b-59c1-8b2b-454dd9a6f47f', '4672337f-b1c1-59a3-a7b6-1540179a02a7', 'a0e68250-b9bf-5982-a741-85a98a9b4025', true, NULL, 29000, now()),
  ('639eb07c-a8e8-5712-ac84-9f802365e22e', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '0d4d7742-86a7-5e06-964c-2a992bb0cf36', true, NULL, 65000, now()),
  ('4ffe85d1-7966-52e2-b893-21243c021e31', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '362adaac-d859-5e40-b0a0-d0ecff6df87e', true, NULL, 42000, now()),
  ('4d6137ef-d5ac-56f4-b680-f562f2e9286f', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '12a5d40a-a190-5389-abf5-2f8a66d2a390', false, NULL, NULL, now()),
  ('78abf24a-ffa3-571c-bf60-2283d1386b4e', '4672337f-b1c1-59a3-a7b6-1540179a02a7', 'e9db279e-25ac-5541-816c-53735fd1253d', false, NULL, NULL, now()),
  ('b96e2bcf-ec5e-5ff5-aea6-1b88611fc590', '4672337f-b1c1-59a3-a7b6-1540179a02a7', 'edc295f7-6afc-5015-8103-12237cf1ffd8', true, '(11) 90000-4120', NULL, now()),
  ('22e140c4-78f9-580a-bd79-5e89f6cd61b6', '4672337f-b1c1-59a3-a7b6-1540179a02a7', 'b826b99d-ac3f-5fbe-bccd-6a51184adc13', true, '@drogariaaurora', NULL, now()),
  ('e54d66ac-d4c1-5556-9948-7027cb0b0dc6', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '69e50651-9c2f-5633-9082-7a0a7acf949a', true, 'Drogaria Aurora Santana', NULL, now()),
  ('1c2ad0ca-f6db-5465-971b-e1fd7883863e', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '94b6dafa-f996-5daf-92a4-74ba22f6dd44', false, NULL, NULL, now())
ON CONFLICT DO NOTHING;

INSERT INTO store_custom_entries (id, store_id, kind, name, category, monthly_cost_cents, updated_at) VALUES ('7347eb5f-860c-5c26-8034-14391b4352ca', '4672337f-b1c1-59a3-a7b6-1540179a02a7', 'EXTERNAL_TOOL', 'Planilha de escala própria', 'Gestão de equipe', 0, now()) ON CONFLICT DO NOTHING;

COMMIT;
