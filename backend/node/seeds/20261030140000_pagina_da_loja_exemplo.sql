-- Dados de exemplo FICTÍCIOS da página da loja (protótipo "Loja Detalhe"). Só local/dev.
-- Idempotente: só preenche o que está vazio e usa IDs fixos com ON CONFLICT DO NOTHING.
BEGIN;

-- Lojas de 001 guardavam o endereço inteiro em um campo; separa logradouro, número e bairro
-- (só onde ainda não foi separado).
UPDATE stores
   SET number = trim(split_part(split_part(street, ' · ', 1), ', ', array_length(string_to_array(split_part(street, ' · ', 1), ', '), 1))),
       district = nullif(trim(split_part(street, ' · ', 2)), ''),
       street = trim(array_to_string((string_to_array(split_part(street, ' · ', 1), ', '))[1:array_length(string_to_array(split_part(street, ' · ', 1), ', '), 1) - 1], ', '))
 WHERE number IS NULL AND street LIKE '%, % · %';

UPDATE stores SET
  legal_name = 'AURORA NORTE COM. DE MEDICAMENTOS LTDA - FILIAL 01', state_registration = '118828039101', zip = '01041000', tax_regime = 'PRESUMIDO',
  name = 'Aurora Centro', trade_name = 'DROGARIA AURORA', store_category = 'Própria', affiliated_network = 'SP Farma',
  phone1 = '1130004100', phone2 = '1130004101', whatsapp = '11900004100', delivery_phone = '1130004199', email = 'centro@auroranorte.com.br',
  owner_mobile = '11900004410', owner_personal_email = 'carla.mendonca@exemplo.com.br',
  pop_zip = '01041000', pop_street = 'Rua Barão de Itapetininga', pop_number = '120', pop_district = 'República',
  pop_complement = 'Em frente à Praça da República', pop_city = 'São Paulo', pop_uf = 'SP',
  validated_at = '2026-09-02 10:00:00-03', validated_by = 'F-1A0PR'
WHERE id = '3ffec902-0b55-5dc5-8db5-f942572b135f' AND legal_name IS NULL;

UPDATE stores SET
  legal_name = 'AURORA NORTE COMÉRCIO DE MEDICAMENTOS LTDA - FILIAL 02', state_registration = '118828039110', zip = '02011000', tax_regime = 'PRESUMIDO',
  name = 'Aurora Santana', trade_name = 'DROGARIA AURORA', store_category = 'Conversão', affiliated_network = 'SP Farma',
  phone1 = '1130004120', phone2 = '1130004121', whatsapp = '11900004120', delivery_phone = '1130004199', email = 'santana@auroranorte.com.br',
  owner_mobile = '11900004410', owner_personal_email = 'carla.mendonca@exemplo.com.br',
  pop_zip = '02011100', pop_street = 'Av. Cruzeiro do Sul', pop_number = '3100', pop_district = 'Santana',
  pop_complement = 'Esquina com a R. Voluntários da Pátria', pop_city = 'São Paulo', pop_uf = 'SP',
  validated_at = '2026-05-14 10:00:00-03', validated_by = 'F-1A0PR'
WHERE id = '4672337f-b1c1-59a3-a7b6-1540179a02a7' AND legal_name IS NULL;

UPDATE stores SET
  legal_name = 'AURORA NORTE COM. DE MEDICAMENTOS LTDA - FILIAL 07', state_registration = '244135880117', zip = '13012000', tax_regime = 'PRESUMIDO',
  name = 'Aurora Campinas', trade_name = 'DROGARIA AURORA', store_category = 'Própria', affiliated_network = 'SP Farma',
  phone1 = '1930002207', phone2 = NULL, whatsapp = '19900002207', delivery_phone = NULL, email = 'campinas@auroranorte.com.br',
  owner_mobile = '11900004410', owner_personal_email = 'carla.mendonca@exemplo.com.br',
  pop_zip = '13012000', pop_street = 'Av. Francisco Glicério', pop_number = '1020', pop_district = 'Centro',
  pop_complement = NULL, pop_city = 'Campinas', pop_uf = 'SP',
  validated_at = '2026-01-10 10:00:00-03', validated_by = 'F-1A0PR'
WHERE id = '3e286817-c743-5cd1-b869-4797000f6d05' AND legal_name IS NULL;

INSERT INTO store_documents (id, store_id, economic_group_id, doc_type, file_name, mime_type, size_bytes, valid_until, uploaded_by_kind, uploaded_by, created_at) VALUES
  ('9cb90d8c-3876-5561-99c6-94a7760d3463', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'CNPJ_CARD', 'cartao-cnpj-0002.pdf', 'application/pdf', 69, NULL, 'PLATFORM', 'OP-02', '2026-01-28 10:00:00-03'),
  ('83830460-eb07-5eb0-90eb-40dce51927e2', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'OPERATING_PERMIT', 'alvara-2026.pdf', 'application/pdf', 69, '2027-06-30', 'TENANT', 'F-1A0PR', '2026-07-05 10:00:00-03'),
  ('91fcd9ee-44ba-51e2-83bb-0cefd855ea38', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'SANITARY_LICENSE', 'licenca-sanitaria-2025.pdf', 'application/pdf', 69, '2026-11-15', 'TENANT', 'F-1A0PR', '2025-11-20 10:00:00-03'),
  ('2f9a3ea9-28f5-5266-84c1-e82094956c3b', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'AFE', 'afe-anvisa.pdf', 'application/pdf', 69, NULL, 'TENANT', 'F-1A0PR', '2018-04-12 10:00:00-03'),
  ('0f1137b4-dcf3-58f5-bde8-51c00774cfe4', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'CRF', 'certidao-crf-2025.pdf', 'application/pdf', 69, '2026-09-30', 'TENANT', 'F-1A0PR', '2025-10-01 10:00:00-03'),
  ('2fdc5da8-8b9d-5fab-bccd-7d23aa1cd26d', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'ASSOCIATION_CONTRACT', 'contrato-associacao.pdf', 'application/pdf', 69, '2027-12-31', 'PLATFORM', 'OP-02', '2024-01-02 10:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO store_document_files (document_id, content) VALUES
  ('9cb90d8c-3876-5561-99c6-94a7760d3463', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64')),
  ('83830460-eb07-5eb0-90eb-40dce51927e2', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64')),
  ('91fcd9ee-44ba-51e2-83bb-0cefd855ea38', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64')),
  ('2f9a3ea9-28f5-5266-84c1-e82094956c3b', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64')),
  ('0f1137b4-dcf3-58f5-bde8-51c00774cfe4', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64')),
  ('2fdc5da8-8b9d-5fab-bccd-7d23aa1cd26d', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64'))
ON CONFLICT DO NOTHING;

INSERT INTO store_change_requests (id, store_id, economic_group_id, type, origin, requested_by, requested_values, effective_date, justification, current_step, status, created_at, updated_at) VALUES
  ('25bed5a0-f3fd-5e48-8c9f-0dce8df0d61c', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'TAX_REGIME', 'TENANT', 'F-1A0PR', '{"taxRegime": "SIMPLES"}'::jsonb, '2027-01-01', 'Faturamento abaixo do limite do Simples após a separação das filiais', 1, 'OPEN', '2026-10-20 15:00:00-03', '2026-10-20 15:00:00-03'),
  ('651e1131-0288-53c5-ae2b-33ea46502a80', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'ADDRESS', 'TENANT', 'F-1A0PR', '{"zip": "02012000", "street": "Av. Braz Leme", "number": "1200", "district": "Santana", "city": "São Paulo", "uf": "SP"}'::jsonb, '2026-12-01', 'Loja muda para ponto maior na mesma região', 1, 'OPEN', '2026-10-18 11:00:00-03', '2026-10-18 11:00:00-03'),
  ('30ec746a-a98c-5623-be8a-0c9f61e5e5ed', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'CNPJ', 'PLATFORM', 'OP-07', '{"cnpj": "41583276000208", "legalName": "AURORA NORTE COMÉRCIO DE MEDICAMENTOS LTDA - FILIAL 02", "stateRegistration": "118828039110"}'::jsonb, '2026-02-01', 'Conversão da loja para o grupo Aurora Norte', 4, 'EFFECTIVE', '2026-01-10 09:00:00-03', '2026-01-10 09:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO store_change_request_events (id, request_id, step_index, action, actor_kind, actor_subject, created_at) VALUES
  ('946e2a4c-797d-5bd2-bf5c-5431eb735584', '25bed5a0-f3fd-5e48-8c9f-0dce8df0d61c', 0, 'OPENED', 'TENANT', 'F-1A0PR', '2026-10-20 15:00:00-03'),
  ('b480d942-d756-508b-ab12-596d17fe8aa2', '651e1131-0288-53c5-ae2b-33ea46502a80', 0, 'OPENED', 'TENANT', 'F-1A0PR', '2026-10-18 11:00:00-03'),
  ('b3e85f59-c7ac-5ee7-9286-aaeb2600943a', '30ec746a-a98c-5623-be8a-0c9f61e5e5ed', 0, 'OPENED', 'PLATFORM', 'OP-07', '2026-01-10 09:00:00-03'),
  ('a78499ef-eacd-588f-8878-c2700d9fd704', '30ec746a-a98c-5623-be8a-0c9f61e5e5ed', 1, 'STEP_DONE', 'PLATFORM', 'OP-07', '2026-01-10 14:00:00-03'),
  ('e5ed6ba3-b718-5bcb-8cf3-f3a930ac0e55', '30ec746a-a98c-5623-be8a-0c9f61e5e5ed', 2, 'STEP_DONE', 'PLATFORM', 'OP-07', '2026-01-12 10:00:00-03'),
  ('3503a818-e7fb-5495-8851-2a15d2afc477', '30ec746a-a98c-5623-be8a-0c9f61e5e5ed', 3, 'EFFECTIVE', 'PLATFORM', 'OP-07', '2026-01-28 10:00:00-03')
ON CONFLICT DO NOTHING;

INSERT INTO store_documents (id, store_id, economic_group_id, doc_type, request_id, file_name, mime_type, size_bytes, uploaded_by_kind, uploaded_by, created_at) VALUES
  ('82a6ab77-576f-5fbf-83ab-22dc0f90eb28', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'OPTION_TERM', '25bed5a0-f3fd-5e48-8c9f-0dce8df0d61c', 'termo-de-opcao-simples.pdf', 'application/pdf', 69, 'TENANT', 'F-1A0PR', '2026-10-20 15:05:00-03')
ON CONFLICT DO NOTHING;
INSERT INTO store_document_files (document_id, content) VALUES ('82a6ab77-576f-5fbf-83ab-22dc0f90eb28', decode('JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK', 'base64')) ON CONFLICT DO NOTHING;

INSERT INTO store_history (id, store_id, economic_group_id, kind, field_key, field_label, old_value, new_value, actor_kind, actor_subject, actor_role, justification, created_at) VALUES
  ('28a2bd9d-3663-5672-a47f-647513cd326d', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'EDIT', 'phone2', 'Telefone 2', '1130004100', '1130004121', 'PLATFORM', 'OP-03', 'PLATFORM_ADMIN', 'Atualização pedida pelo grupo por telefone', '2026-10-24 09:10:00-03'),
  ('fe856602-bb55-5bc7-9aab-298e2c96e805', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'EDIT', 'name', 'Apelido da loja', 'Santana', 'Aurora Santana', 'TENANT', 'F-1A0PR', 'TENANT_ADMIN', NULL, '2026-10-23 15:42:00-03'),
  ('e4fd36bb-f24c-5757-9d07-fd6c1aad9c9d', '4672337f-b1c1-59a3-a7b6-1540179a02a7', '858e0553-5b86-52f1-82b9-83aaf39902b6', 'VALIDATION', NULL, 'Validação semestral dos dados', NULL, 'Validada', 'TENANT', 'F-1A0PR', 'TENANT_ADMIN', NULL, '2026-05-14 10:00:00-03')
ON CONFLICT DO NOTHING;

COMMIT;
