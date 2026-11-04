-- Dados de exemplo FICTÍCIOS: parceiros da Farmarcas (indústrias e distribuidores, com contatos)
-- e lojas em etapas e bloqueios diferentes (spec 003, US3/US4). Só local/dev.
-- Depende da migration backoffice_fase2_p2 e da rede de exemplo (20261031120000).
-- Empresas e pessoas inventadas; CNPJs inventados com dígito válido.
BEGIN;

-- Parceiros: IDs fixos + ON CONFLICT DO NOTHING (rodar de novo não duplica nem desfaz edições).
INSERT INTO partners (id, type, cnpj, legal_name, trade_name, status, created_at, updated_at)
SELECT overlay(overlay(md5('seed-parceiro-' || p.cnpj) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid,
       p.type::partner_type, p.cnpj, p.legal_name, p.trade_name, p.status::partner_status,
       timestamptz '2025-03-10 10:00:00-03', timestamptz '2025-03-10 10:00:00-03'
  FROM (VALUES
    ('INDUSTRY',    '61034275000130', 'Vitalis Farmacêutica S/A',                     'Vitalis',          'ACTIVE'),
    ('INDUSTRY',    '62451893000149', 'Lumina Laboratórios Ltda',                     'Lumina',           'ACTIVE'),
    ('INDUSTRY',    '63887120000172', 'Biotera Indústria Farmacêutica S/A',           'Biotera',          'ACTIVE'),
    ('INDUSTRY',    '64520917000108', 'Prisma Genéricos S/A',                         'Prisma Genéricos', 'ACTIVE'),
    ('INDUSTRY',    '65773148000104', 'Nativa Dermocosméticos Ltda',                  'Nativa',           'ACTIVE'),
    ('INDUSTRY',    '66994502000193', 'Orla Higiene Pessoal Ltda',                    'Orla',             'INACTIVE'),
    ('DISTRIBUTOR', '67120358000129', 'Rota Sul Distribuidora de Medicamentos Ltda',  'Rota Sul',         'ACTIVE'),
    ('DISTRIBUTOR', '68335691000118', 'Norte Med Distribuição Ltda',                  'Norte Med',        'ACTIVE'),
    ('DISTRIBUTOR', '69448023000160', 'Central Farma Logística S/A',                  'Central Farma',    'ACTIVE'),
    ('DISTRIBUTOR', '70561734000125', 'Planalto Distribuidora Farmacêutica Ltda',     'Planalto Dist',    'ACTIVE')
  ) AS p(type, cnpj, legal_name, trade_name, status)
ON CONFLICT DO NOTHING;

-- Contatos comerciais. O Central Farma fica sem contato principal, para a pendência aparecer.
INSERT INTO partner_contacts (id, partner_id, name, job_title, email, phone, is_primary, created_at, updated_at)
SELECT overlay(overlay(md5('seed-contato-' || c.cnpj || '-' || c.ord) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid,
       overlay(overlay(md5('seed-parceiro-' || c.cnpj) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid,
       c.name, c.job_title, c.email, c.phone, c.is_primary,
       timestamptz '2025-03-10 10:00:00-03' + c.ord * interval '1 minute',
       timestamptz '2025-03-10 10:00:00-03' + c.ord * interval '1 minute'
  FROM (VALUES
    ('61034275000130', 1, 'Fernanda Ribas',   'Gerente de contas',         'fernanda.ribas@vitalis.exemplo.com.br',   '11900003101', true),
    ('61034275000130', 2, 'Otávio Prates',    'Representante comercial',   'otavio.prates@vitalis.exemplo.com.br',    NULL,          false),
    ('62451893000149', 1, 'Lívia Moraes',     'Key account',               'livia.moraes@lumina.exemplo.com.br',      '11900003202', true),
    ('63887120000172', 1, 'Ricardo Teles',    'Gerente regional',          'ricardo.teles@biotera.exemplo.com.br',    '21900003303', true),
    ('63887120000172', 2, 'Paula Azevedo',    'Trade marketing',           'paula.azevedo@biotera.exemplo.com.br',    NULL,          false),
    ('64520917000108', 1, 'Marcos Viana',     'Gerente de contas',         'marcos.viana@prisma.exemplo.com.br',      '11900003404', true),
    ('65773148000104', 1, 'Sabrina Kato',     'Representante comercial',   'sabrina.kato@nativa.exemplo.com.br',      '41900003505', true),
    ('66994502000193', 1, 'Hugo Farias',      'Gerente de contas',         'hugo.farias@orla.exemplo.com.br',         NULL,          true),
    ('67120358000129', 1, 'Daniela Brito',    'Gerente comercial',         'daniela.brito@rotasul.exemplo.com.br',    '51900003707', true),
    ('67120358000129', 2, 'Cláudio Reis',     'Atendimento ao varejo',     NULL,                                      '51900003708', false),
    ('68335691000118', 1, 'Igor Santana',     'Gerente comercial',         'igor.santana@nortemed.exemplo.com.br',    '92900003809', true),
    ('69448023000160', 1, 'Talita Nogueira',  'Analista comercial',        'talita.nogueira@centralfarma.exemplo.com.br', NULL,      false),
    ('70561734000125', 1, 'Rogério Lacerda',  'Gerente de contas',         'rogerio.lacerda@planalto.exemplo.com.br', '62900003911', true)
  ) AS c(cnpj, ord, name, job_title, email, phone, is_primary)
ON CONFLICT DO NOTHING;

INSERT INTO audit_events (id, economic_group_id, entity_type, entity_id, action, summary, actor_subject, actor_role, justification, created_at)
SELECT overlay(overlay(md5('seed-parceiro-audit-' || p.cnpj) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid,
       NULL, 'PARTNER', p.id, 'PARTNER_CREATED',
       CASE p.type WHEN 'INDUSTRY' THEN 'Indústria ' ELSE 'Distribuidor ' END || p.trade_name || ' cadastrado',
       'OP-02', 'PLATFORM_ADMIN', NULL, p.created_at
  FROM partners p
 WHERE p.id = overlay(overlay(md5('seed-parceiro-' || p.cnpj) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid
ON CONFLICT DO NOTHING;

-- Lojas em etapas e bloqueios diferentes. Aplicado UMA vez: depois que alguma loja da rede de
-- exemplo estiver em montagem ou bloqueada, nada é refeito (o seed roda a cada subida e não
-- pode desfazer o que foi mudado na tela).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores WHERE code > 1000 AND (stage = 'SETUP' OR blocked_at IS NOT NULL)) THEN
    -- Num banco novo os seeds anteriores entram depois da migration: loja com data de abertura
    -- está inaugurada (mesma regra do backfill da migration backoffice_fase2_p2).
    UPDATE stores SET stage = 'OPENED' WHERE stage = 'PROSPECTING' AND opened_at IS NOT NULL;
    -- Cerca de 1 em 15 em montagem e 1 em 25 em prospecção (sem data de inauguração).
    UPDATE stores SET stage = 'SETUP', opened_at = NULL
     WHERE code > 1000 AND code % 15 = 0 AND status <> 'INACTIVE';
    UPDATE stores SET stage = 'PROSPECTING', opened_at = NULL, status = 'PENDING'
     WHERE code > 1000 AND code % 25 = 7;
    -- Algumas bloqueadas, com motivo (o grupo deixa de ver essas lojas).
    UPDATE stores SET blocked_at = now() - (code % 40) * interval '1 day',
                      blocked_reason = 'Pendência financeira com a Farmarcas',
                      blocked_by = 'OP-02'
     WHERE code > 1000 AND code % 97 = 3 AND status <> 'INACTIVE';
  END IF;
END $$;

COMMIT;
