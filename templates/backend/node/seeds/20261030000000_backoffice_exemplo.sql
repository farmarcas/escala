-- Dados de exemplo FICTÍCIOS do protótipo "Suite Operator" (Radar Suite). Só local/dev.
-- Idempotente: IDs fixos + ON CONFLICT DO NOTHING; não sobrescreve o que foi alterado na tela.
-- Roda com o dono do banco (RLS não se aplica ao dono). Arquivo gerado; CNPJs com dígito válido.
BEGIN;

INSERT INTO brands (id, name, normalized_name, status, created_at, updated_at) VALUES
  ('0f1dced3-1506-5e07-a94f-835d9898b6ae', 'Rede Aurora', 'rede aurora', 'ACTIVE', '2024-03-12 12:00:00-03', '2024-03-12 12:00:00-03'),
  ('6d06a9d5-5b00-5239-a68f-00abe65ebdc9', 'Vitta Popular', 'vitta popular', 'ACTIVE', '2024-03-12 12:00:00-03', '2024-03-12 12:00:00-03'),
  ('a3efdb0b-f996-5d26-89c1-8cc85ca6f6b4', 'FarmaNova', 'farmanova', 'ACTIVE', '2024-08-05 12:00:00-03', '2024-08-05 12:00:00-03'),
  ('0ae97b9e-1015-5aef-bb3c-81a8db9694a7', 'Bem Viver', 'bem viver', 'ACTIVE', '2024-08-05 12:00:00-03', '2024-08-05 12:00:00-03'),
  ('dd7566a5-e9eb-5a48-a16f-ade95143f401', 'Pharmavale', 'pharmavale', 'ACTIVE', '2025-01-19 12:00:00-03', '2025-01-19 12:00:00-03'),
  ('993a6b61-e180-5d05-9079-c9b23a967df4', 'Mais Saúde', 'mais saude', 'ACTIVE', '2025-01-19 12:00:00-03', '2025-01-19 12:00:00-03'),
  ('1c1ddd37-627f-5a9e-9278-2155affa056d', 'Popular Sul', 'popular sul', 'ACTIVE', '2025-02-02 12:00:00-03', '2025-02-02 12:00:00-03'),
  ('09b946df-cd6c-5001-b890-3fd7495ba748', 'Farmaclin', 'farmaclin', 'ACTIVE', '2025-02-02 12:00:00-03', '2025-02-02 12:00:00-03'),
  ('71cf2d9f-e4ea-58f2-ac89-26dfa727026b', 'Vida Leve', 'vida leve', 'ACTIVE', '2026-09-10 12:00:00-03', '2026-09-10 12:00:00-03'),
  ('a7b38f69-4ba8-5c0b-b2b7-3a657a641235', 'Drogaria Horizonte', 'drogaria horizonte', 'HISTORICAL', '2023-06-08 12:00:00-03', '2023-06-08 12:00:00-03'),
  ('f7aaf5a0-f524-5541-9d28-f578707cd467', 'Rede Cuidar', 'rede cuidar', 'HISTORICAL', '2023-06-08 12:00:00-03', '2023-06-08 12:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO economic_groups (id, number, name, legal_name, cnpj, status, created_at, updated_at) VALUES
  ('858e0553-5b86-52f1-82b9-83aaf39902b6', 417, 'Grupo Aurora Norte', 'Aurora Norte Comércio de Medicamentos Ltda', '41583276000127', 'ACTIVE', '2026-07-31 12:00:00-03', '2026-07-31 12:00:00-03'),
  ('b3d8968c-51f1-5f37-80e0-c7fa88b71096', 388, 'Grupo Lumen', 'Lumen Drogarias S/A', '27310944000111', 'ACTIVE', '2026-05-12 12:00:00-03', '2026-05-12 12:00:00-03'),
  ('0c168ae1-7099-5c23-a98e-63e8065f4514', 129, 'Grupo Serra Azul', 'Serra Azul Farmácias Ltda', '18450127000178', 'ACTIVE', '2026-03-03 12:00:00-03', '2026-03-03 12:00:00-03'),
  ('fc14d82e-43d9-560b-8cec-17e9f368d539', 452, 'Grupo Vale Verde', 'Vale Verde Medicamentos Ltda', '33902118000164', 'ACTIVE', '2026-10-15 12:00:00-03', '2026-10-15 12:00:00-03'),
  ('0460539d-29d3-59fa-83a2-26971cd6c21e', 66, 'Grupo Ipê', 'Ipê Comércio Farmacêutico Ltda', '12347556000138', 'ACTIVE', '2026-02-10 12:00:00-03', '2026-02-10 12:00:00-03'),
  ('79e5e44f-ed92-537a-869e-f5613f89c552', 301, 'Grupo Ponte Alta', 'Ponte Alta Drogarias Ltda', '20739844000166', 'SUSPENDED', '2025-11-20 12:00:00-03', '2025-11-20 12:00:00-03'),
  ('25777871-39e6-5ab6-9bb6-e2cc0d1bf52f', 214, 'Grupo Brisa', 'Brisa Farma Ltda', '09884120000173', 'ARCHIVED', '2025-08-01 12:00:00-03', '2025-08-01 12:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO group_owners (id, economic_group_id, name, email, phone, pseudonym, created_at, updated_at) VALUES
  ('a7d2f5bf-e3c5-56f2-a2d5-33cd6e872edc', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'Carla Mendonça', 'carla.mendonca@exemplo.com.br', '11900004410', 'F-1A0PR', '2026-07-31 12:00:00-03', '2026-07-31 12:00:00-03'),
  ('d573cff1-ae99-5ea7-a681-fd9d668a0ec4', 'b3d8968c-51f1-5f37-80e0-c7fa88b71096', 'Rodrigo Teles', 'rodrigo.teles@exemplo.com.br', '41900002277', 'F-4C2MZ', '2026-05-12 12:00:00-03', '2026-05-12 12:00:00-03'),
  ('9e80cdbb-8478-5836-a0cb-b359d731d58e', '0c168ae1-7099-5c23-a98e-63e8065f4514', 'Juliana Paixão', 'juliana.paixao@exemplo.com.br', '31900007733', 'F-8D5KQ', '2026-03-03 12:00:00-03', '2026-03-03 12:00:00-03'),
  ('4215b136-5be5-5aca-a719-e53fbdb0222f', 'fc14d82e-43d9-560b-8cec-17e9f368d539', 'Marcos Belo', 'marcos.belo@exemplo.com.br', '62900008844', 'F-6R3WB', '2026-10-15 12:00:00-03', '2026-10-15 12:00:00-03'),
  ('06a1ed6e-22be-5bc5-a1c9-46028246feea', '79e5e44f-ed92-537a-869e-f5613f89c552', 'Helena Rocha', 'helena.rocha@exemplo.com.br', '85900001120', 'F-2T7HN', '2025-11-20 12:00:00-03', '2025-11-20 12:00:00-03'),
  ('63756325-2b3c-50d8-8bd3-ed824d951ba3', '25777871-39e6-5ab6-9bb6-e2cc0d1bf52f', 'Paulo Krauss', 'paulo.krauss@exemplo.com.br', '71900005531', 'F-5N9JE', '2025-08-01 12:00:00-03', '2025-08-01 12:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO stores (id, code, economic_group_id, brand_id, name, type, cnpj, street, number, district, city, uf, opened_at, status, created_at, updated_at) VALUES
  ('3ffec902-0b55-5dc5-8db5-f942572b135f', 1, '858e0553-5b86-52f1-82b9-83aaf39902b6', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'Drogaria Aurora Centro', 'PDV', '41583276000127', 'Rua Barão de Itapetininga', '120', 'República', 'São Paulo', 'SP', '2019-03-14', 'ACTIVE', '2019-03-14 12:00:00-03', '2019-03-14 12:00:00-03'),
  ('4672337f-b1c1-59a3-a7b6-1540179a02a7', 2, '858e0553-5b86-52f1-82b9-83aaf39902b6', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'Drogaria Aurora Santana', 'PDV', '41583276000208', 'Rua Voluntários da Pátria', '2.410', 'Santana', 'São Paulo', 'SP', '2020-08-02', 'ACTIVE', '2020-08-02 12:00:00-03', '2020-08-02 12:00:00-03'),
  ('a34c8671-9fbb-5062-bd59-0e759db8acde', 90, '858e0553-5b86-52f1-82b9-83aaf39902b6', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'CD Aurora Cajamar', 'CD', '41583276009000', 'Rodovia Anhanguera', 'km 31', 'Jordanésia', 'Cajamar', 'SP', '2018-01-05', 'ACTIVE', '2018-01-05 12:00:00-03', '2018-01-05 12:00:00-03'),
  ('3e286817-c743-5cd1-b869-4797000f6d05', 14, '858e0553-5b86-52f1-82b9-83aaf39902b6', '6d06a9d5-5b00-5239-a68f-00abe65ebdc9', 'Drogaria Aurora Campinas', 'PDV', '41583276001441', 'Av. Francisco Glicério', '1.020', 'Centro', 'Campinas', 'SP', '2021-11-19', 'ACTIVE', '2021-11-19 12:00:00-03', '2021-11-19 12:00:00-03'),
  ('db4d2a25-0cbb-504e-b4d1-bd632a447338', 22, '858e0553-5b86-52f1-82b9-83aaf39902b6', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'Drogaria Aurora Savassi', 'PDV', '41583276002251', 'Rua Pernambuco', '880', 'Savassi', 'Belo Horizonte', 'MG', '2022-05-07', 'ACTIVE', '2022-05-07 12:00:00-03', '2022-05-07 12:00:00-03'),
  ('3aa9e65e-b1b2-57e2-9d63-c137fb0c4e21', 91, '858e0553-5b86-52f1-82b9-83aaf39902b6', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'CD Aurora Contagem', 'CD', '41583276009183', 'Av. das Américas', '500', 'Cinco', 'Contagem', 'MG', '2022-08-14', 'ACTIVE', '2022-08-14 12:00:00-03', '2022-08-14 12:00:00-03'),
  ('a86ee3fa-5475-5273-87a2-e48298938942', 31, '858e0553-5b86-52f1-82b9-83aaf39902b6', '6d06a9d5-5b00-5239-a68f-00abe65ebdc9', 'Drogaria Aurora Batel', 'PDV', '41583276003142', 'Av. do Batel', '1.550', 'Batel', 'Curitiba', 'PR', '2024-02-23', 'ACTIVE', '2024-02-23 12:00:00-03', '2024-02-23 12:00:00-03'),
  ('35e06b6b-861d-5c32-b6dc-c2b3e92261e7', 37, '858e0553-5b86-52f1-82b9-83aaf39902b6', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'Drogaria Aurora Guarulhos', 'PDV', '41583276003738', 'Av. Timóteo Penteado', '3.200', 'Vila Galvão', 'Guarulhos', 'SP', '2023-06-11', 'INACTIVE', '2023-06-11 12:00:00-03', '2023-06-11 12:00:00-03'),
  ('330b0764-e04f-5490-9e99-baad27045708', 101, 'b3d8968c-51f1-5f37-80e0-c7fa88b71096', 'a3efdb0b-f996-5d26-89c1-8cc85ca6f6b4', 'Drogaria Lumen Água Verde', 'PDV', '27310944000111', 'Av. República Argentina', '1.100', 'Água Verde', 'Curitiba', 'PR', '2017-04-10', 'ACTIVE', '2017-04-10 12:00:00-03', '2017-04-10 12:00:00-03'),
  ('424b7e6a-ebbe-533f-bcb0-0e6a881b068c', 102, 'b3d8968c-51f1-5f37-80e0-c7fa88b71096', '6d06a9d5-5b00-5239-a68f-00abe65ebdc9', 'Drogaria Lumen Centro', 'PDV', '27310944000200', 'Rua XV de Novembro', '300', 'Centro', 'Curitiba', 'PR', '2018-09-21', 'ACTIVE', '2018-09-21 12:00:00-03', '2018-09-21 12:00:00-03'),
  ('2f94d9b0-1877-59bc-9a49-5fd868da4f14', 103, 'b3d8968c-51f1-5f37-80e0-c7fa88b71096', 'a3efdb0b-f996-5d26-89c1-8cc85ca6f6b4', 'Drogaria Lumen Trindade', 'PDV', '27310944000383', 'Rua Lauro Linhares', '870', 'Trindade', 'Florianópolis', 'SC', '2021-02-15', 'ACTIVE', '2021-02-15 12:00:00-03', '2021-02-15 12:00:00-03'),
  ('1621482c-1bac-5224-839e-bf9be2a5475c', 104, 'b3d8968c-51f1-5f37-80e0-c7fa88b71096', 'a3efdb0b-f996-5d26-89c1-8cc85ca6f6b4', 'CD Lumen São José dos Pinhais', 'CD', '27310944000464', 'Av. Rui Barbosa', '4.200', 'Afonso Pena', 'São José dos Pinhais', 'PR', '2019-06-30', 'ACTIVE', '2019-06-30 12:00:00-03', '2019-06-30 12:00:00-03'),
  ('e57a6d6e-0ecc-54b2-baf4-323c68d22b67', 111, '0c168ae1-7099-5c23-a98e-63e8065f4514', '0ae97b9e-1015-5aef-bb3c-81a8db9694a7', 'Serra Azul Contorno', 'PDV', '18450127000178', 'Av. do Contorno', '6.000', 'Funcionários', 'Belo Horizonte', 'MG', '2016-10-03', 'ACTIVE', '2016-10-03 12:00:00-03', '2016-10-03 12:00:00-03'),
  ('57977766-bf8d-5e4a-8ba2-35997a6e1b02', 112, '0c168ae1-7099-5c23-a98e-63e8065f4514', '0ae97b9e-1015-5aef-bb3c-81a8db9694a7', 'Serra Azul Praia do Canto', 'PDV', '18450127000259', 'Rua Aleixo Netto', '410', 'Praia do Canto', 'Vitória', 'ES', '2020-05-18', 'ACTIVE', '2020-05-18 12:00:00-03', '2020-05-18 12:00:00-03'),
  ('0cb1cab0-0ae2-579e-bc96-e146a6fb3f0c', 121, 'fc14d82e-43d9-560b-8cec-17e9f368d539', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'Drogaria Vale Verde Setor Bueno', 'PDV', '33902118000164', 'Av. T-4', '1.200', 'Setor Bueno', 'Goiânia', 'GO', '2015-07-01', 'ACTIVE', '2015-07-01 12:00:00-03', '2015-07-01 12:00:00-03'),
  ('fab4ddb6-25bc-5ba2-9910-0f14a6ff4ae0', 122, 'fc14d82e-43d9-560b-8cec-17e9f368d539', '993a6b61-e180-5d05-9079-c9b23a967df4', 'Drogaria Vale Verde Asa Sul', 'PDV', '33902118000245', 'SCLS 404', 'Bloco B', 'Asa Sul', 'Brasília', 'DF', '2019-12-09', 'ACTIVE', '2019-12-09 12:00:00-03', '2019-12-09 12:00:00-03'),
  ('9e8f11d8-0095-55b9-b7b5-66d4b70f3c92', 123, 'fc14d82e-43d9-560b-8cec-17e9f368d539', '0f1dced3-1506-5e07-a94f-835d9898b6ae', 'CD Vale Verde Aparecida', 'CD', '33902118000326', 'Av. Independência', '7.100', 'Setor Industrial', 'Aparecida de Goiânia', 'GO', '2021-03-22', 'ACTIVE', '2021-03-22 12:00:00-03', '2021-03-22 12:00:00-03'),
  ('fa7d0ab6-d1c0-5c9d-bac5-adefa1adecda', 131, '0460539d-29d3-59fa-83a2-26971cd6c21e', 'dd7566a5-e9eb-5a48-a16f-ade95143f401', 'Farmácia Ipê Moinhos', 'PDV', '12347556000138', 'Rua Padre Chagas', '230', 'Moinhos de Vento', 'Porto Alegre', 'RS', '2014-08-11', 'ACTIVE', '2014-08-11 12:00:00-03', '2014-08-11 12:00:00-03'),
  ('c4c433fc-1bec-5b56-ac8b-4cb5b36e25c0', 132, '0460539d-29d3-59fa-83a2-26971cd6c21e', 'dd7566a5-e9eb-5a48-a16f-ade95143f401', 'Farmácia Ipê Caxias', 'PDV', '12347556000219', 'Rua Sinimbu', '1.800', 'Centro', 'Caxias do Sul', 'RS', '2018-01-29', 'ACTIVE', '2018-01-29 12:00:00-03', '2018-01-29 12:00:00-03'),
  ('2c915736-2708-524a-b16e-95efbd51d4c2', 141, '79e5e44f-ed92-537a-869e-f5613f89c552', '1c1ddd37-627f-5a9e-9278-2155affa056d', 'Ponte Alta Aldeota', 'PDV', '20739844000166', 'Av. Santos Dumont', '2.500', 'Aldeota', 'Fortaleza', 'CE', '2017-05-05', 'ACTIVE', '2017-05-05 12:00:00-03', '2017-05-05 12:00:00-03'),
  ('f6bdc0af-d827-50c1-bac3-3c6d75907ff3', 151, '25777871-39e6-5ab6-9bb6-e2cc0d1bf52f', '09b946df-cd6c-5001-b890-3fd7495ba748', 'Brisa Farma Barra', 'PDV', '09884120000173', 'Av. Oceânica', '400', 'Barra', 'Salvador', 'BA', '2016-11-11', 'INACTIVE', '2016-11-11 12:00:00-03', '2016-11-11 12:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO audit_events (id, economic_group_id, action, summary, actor_subject, actor_role, justification, created_at) VALUES
  ('05b8df74-33b0-5a26-abd4-d6ccf1f2faaf', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'GROUP_CREATED', 'Grupo cadastrado com 8 lojas e proprietária', 'OP-02', 'PLATFORM_ADMIN', NULL, '2026-07-31 09:03:00-03'),
  ('029a3bbb-23c7-5d44-9def-9a4113f3c6de', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'OWNER_INVITE_ACCEPTED', 'Convite aceito pela proprietária', 'Sistema', 'SYSTEM', NULL, '2026-08-01 10:15:00-03'),
  ('6316f0ed-a8ce-5243-9b08-c29ad0aa7558', '79e5e44f-ed92-537a-869e-f5613f89c552', 'GROUP_SUSPENDED', 'Grupo suspenso', 'OP-02', 'PLATFORM_ADMIN', 'Pedido formal do associado durante revisão contratual.', '2026-10-02 14:20:00-03'),
  ('1c0f30c9-a633-516f-b822-4acd237c13c0', '25777871-39e6-5ab6-9bb6-e2cc0d1bf52f', 'GROUP_ARCHIVED', 'Grupo arquivado', 'OP-02', 'PLATFORM_ADMIN', 'Encerramento das atividades da rede.', '2026-06-30 11:00:00-03')
ON CONFLICT DO NOTHING;

-- Próximos números emitidos continuam depois dos já usados.
SELECT setval(pg_get_serial_sequence('economic_groups', 'number'), GREATEST((SELECT max(number) FROM economic_groups), 1));
SELECT setval(pg_get_serial_sequence('stores', 'code'), GREATEST((SELECT max(code) FROM stores), 1));

COMMIT;
