-- Dados de exemplo FICTÍCIOS: funcionários da Farmarcas e o Anjo de cada grupo (spec 003, US1/US2).
-- Só local/dev. Depende das migrations backoffice_fase2_p1 e funcionario_acessos e dos grupos dos seeds anteriores.
-- Idempotente: IDs fixos (md5 do e-mail, ajustado para UUID válido) + ON CONFLICT DO NOTHING; o Anjo só é definido onde o
-- grupo ainda não tem um, para não desfazer o que foi escolhido na tela.
BEGIN;

-- Departamentos (criados pela migration 20261102120100) e ocupações de exemplo. A busca é pelo
-- nome: num banco que já existia, a migration criou os mesmos itens com outros ids.
INSERT INTO catalog_items (id, kind, name, sort)
SELECT gen_random_uuid(), o.kind::catalog_kind, o.name, o.sort
  FROM (VALUES
    ('DEPARTMENT', 'Comercial', 0),
    ('DEPARTMENT', 'Financeiro do associado', 1),
    ('DEPARTMENT', 'Trade', 2),
    ('DEPARTMENT', 'Produtos digitais', 3),
    ('DEPARTMENT', 'Sucesso do associado', 4),
    ('DEPARTMENT', 'Operações', 5),
    ('OCCUPATION', 'Analista de relacionamento', 0),
    ('OCCUPATION', 'Analista de trade marketing', 1),
    ('OCCUPATION', 'Analista financeiro', 2),
    ('OCCUPATION', 'Coordenador de operações', 3),
    ('OCCUPATION', 'Coordenadora comercial', 4),
    ('OCCUPATION', 'Gerente de produtos digitais', 5),
    ('OCCUPATION', 'Gerente de sucesso do associado', 6),
    ('OCCUPATION', 'Supervisora de relacionamento', 7)
  ) AS o(kind, name, sort)
 WHERE NOT EXISTS (
   SELECT 1 FROM catalog_items c
    WHERE c.kind = o.kind::catalog_kind AND lower(c.name) = lower(o.name) AND c.deleted_at IS NULL
 );

INSERT INTO farmarcas_employees (id, name, email, gender, mobile, landline, department_id, occupation_id, status, terminated_at, created_at, updated_at)
SELECT overlay(overlay(md5('seed-func-' || e.email) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid, e.name, e.email,
       e.gender::employee_gender, e.mobile, e.landline, d.id, o.id, e.status::employee_status,
       CASE WHEN e.status = 'TERMINATED' THEN timestamptz '2026-08-29 18:00:00-03' END,
       timestamptz '2024-02-01 09:00:00-03', timestamptz '2024-02-01 09:00:00-03'
  FROM (VALUES
    ('Juliana Prado',   'juliana.prado@farmarcas.com.br',   'FEMALE', '11900007781', NULL,         'Sucesso do associado',    'Analista de relacionamento',      'ACTIVE'),
    ('Isabela Nunes',   'isabela.nunes@farmarcas.com.br',   'FEMALE', '41900003320', NULL,         'Sucesso do associado',    'Analista de relacionamento',      'ACTIVE'),
    ('Marília Duarte',  'marilia.duarte@farmarcas.com.br',  'FEMALE', '31900004415', NULL,         'Sucesso do associado',    'Analista de relacionamento',      'ACTIVE'),
    ('Rafael Quintana', 'rafael.quintana@farmarcas.com.br', 'MALE',   '11900006692', NULL,         'Sucesso do associado',    'Analista de relacionamento',      'ACTIVE'),
    ('Débora Lins',     'debora.lins@farmarcas.com.br',     'FEMALE', '81900002204', NULL,         'Sucesso do associado',    'Analista de relacionamento',      'ACTIVE'),
    ('Tiago Moreira',   'tiago.moreira@farmarcas.com.br',   'MALE',   '51900008817', NULL,         'Sucesso do associado',    'Analista de relacionamento',      'ACTIVE'),
    ('Renata Alves',    'renata.alves@farmarcas.com.br',    'FEMALE', '11900001150', '1130450000', 'Sucesso do associado',    'Supervisora de relacionamento',   'ACTIVE'),
    ('Bruno Castro',    'bruno.castro@farmarcas.com.br',    'MALE',   '11900009934', '1130450001', 'Sucesso do associado',    'Gerente de sucesso do associado', 'ACTIVE'),
    ('Luana Ferraz',    'luana.ferraz@farmarcas.com.br',    NULL,     NULL,          NULL,         'Comercial',               'Coordenadora comercial',          'ACTIVE'),
    ('Paulo Sardinha',  'paulo.sardinha@farmarcas.com.br',  NULL,     NULL,          NULL,         'Financeiro do associado', 'Analista financeiro',             'ACTIVE'),
    ('Camila Rezende',  'camila.rezende@farmarcas.com.br',  NULL,     NULL,          NULL,         'Trade',                   'Analista de trade marketing',     'ACTIVE'),
    ('Gustavo Pires',   'gustavo.pires@farmarcas.com.br',   'MALE',   '11900005508', NULL,         'Produtos digitais',       'Gerente de produtos digitais',    'ACTIVE'),
    ('Sérgio Matos',    'sergio.matos@farmarcas.com.br',    NULL,     NULL,          NULL,         'Operações',               'Coordenador de operações',        'ACTIVE'),
    ('Helena Vidal',    'helena.vidal@farmarcas.com.br',    NULL,     NULL,          NULL,         'Sucesso do associado',    'Analista de relacionamento',      'TERMINATED')
  ) AS e(name, email, gender, mobile, landline, department, occupation, status)
  JOIN catalog_items d ON d.kind = 'DEPARTMENT' AND d.name = e.department AND d.deleted_at IS NULL
  JOIN catalog_items o ON o.kind = 'OCCUPATION' AND o.name = e.occupation AND o.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Acessos ao Backoffice (spec 005): só para quem ainda não tem nenhum acesso registrado, para não
-- desfazer o que foi mudado na tela. Bruno e Gustavo administram; Renata é gestora.
INSERT INTO employee_system_accesses (id, employee_id, system, role, granted_at, granted_by)
SELECT gen_random_uuid(), e.id, a.system::suite_system, a.role::suite_role, e.created_at, 'OP-02'
  FROM (VALUES
    ('bruno.castro@farmarcas.com.br',    'BACKOFFICE', 'ADMIN'),
    ('gustavo.pires@farmarcas.com.br',   'BACKOFFICE', 'ADMIN'),
    ('gustavo.pires@farmarcas.com.br',   'GESTAO_360', 'ADMIN'),
    ('renata.alves@farmarcas.com.br',    'BACKOFFICE', 'MANAGER'),
    ('renata.alves@farmarcas.com.br',    'GESTAO_360', 'MANAGER'),
    ('juliana.prado@farmarcas.com.br',   'BACKOFFICE', 'ANALYST'),
    ('juliana.prado@farmarcas.com.br',   'GESTAO_360', 'ANALYST'),
    ('isabela.nunes@farmarcas.com.br',   'BACKOFFICE', 'ANALYST'),
    ('marilia.duarte@farmarcas.com.br',  'BACKOFFICE', 'ANALYST'),
    ('rafael.quintana@farmarcas.com.br', 'BACKOFFICE', 'ANALYST'),
    ('debora.lins@farmarcas.com.br',     'BACKOFFICE', 'ANALYST'),
    ('tiago.moreira@farmarcas.com.br',   'BACKOFFICE', 'ANALYST'),
    ('luana.ferraz@farmarcas.com.br',    'BACKOFFICE', 'ANALYST'),
    ('sergio.matos@farmarcas.com.br',    'BACKOFFICE', 'ANALYST'),
    ('sergio.matos@farmarcas.com.br',    'ESCALA',     'MANAGER')
  ) AS a(email, system, role)
  JOIN farmarcas_employees e ON e.email = a.email AND e.status = 'ACTIVE'
 WHERE NOT EXISTS (SELECT 1 FROM employee_system_accesses x WHERE x.employee_id = e.id);

INSERT INTO audit_events (id, economic_group_id, entity_type, entity_id, action, summary, actor_subject, actor_role, justification, created_at)
SELECT overlay(overlay(md5('seed-func-audit-' || e.email) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid, NULL, 'EMPLOYEE', e.id, 'EMPLOYEE_CREATED',
       'Funcionário ' || e.name || ' cadastrado', 'OP-02', 'PLATFORM_ADMIN', NULL, e.created_at
  FROM farmarcas_employees e
 WHERE e.email LIKE '%@farmarcas.com.br' AND e.id = overlay(overlay(md5('seed-func-' || e.email) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid
ON CONFLICT DO NOTHING;

-- Anjos dos grupos do protótipo (Gestão 360: 0417 e 0031 com Juliana, 0185 e 0212 com Isabela,
-- 0066 com Marília).
UPDATE economic_groups g
   SET angel_employee_id = overlay(overlay(md5('seed-func-' || a.email) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid
  FROM (VALUES
    (417, 'juliana.prado@farmarcas.com.br'),
    (301, 'juliana.prado@farmarcas.com.br'),
    (388, 'isabela.nunes@farmarcas.com.br'),
    (452, 'isabela.nunes@farmarcas.com.br'),
    (129, 'marilia.duarte@farmarcas.com.br'),
    (66,  'marilia.duarte@farmarcas.com.br')
  ) AS a(number, email)
 WHERE g.number = a.number AND g.angel_employee_id IS NULL;

-- Rede de exemplo: o Anjo vem da carteira da região da loja principal do grupo; cerca de 1 em
-- cada 12 grupos fica sem Anjo, para a pendência aparecer.
UPDATE economic_groups g
   SET angel_employee_id = overlay(overlay(md5('seed-func-' || pick.email) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid
  FROM (
    SELECT g2.id,
           (CASE
              WHEN s.uf IN ('SP') THEN ARRAY['juliana.prado@farmarcas.com.br', 'rafael.quintana@farmarcas.com.br']
              WHEN s.uf IN ('MG', 'ES', 'RJ') THEN ARRAY['marilia.duarte@farmarcas.com.br', 'rafael.quintana@farmarcas.com.br']
              WHEN s.uf IN ('PR', 'SC', 'RS') THEN ARRAY['isabela.nunes@farmarcas.com.br', 'tiago.moreira@farmarcas.com.br']
              WHEN s.uf IN ('GO', 'DF', 'MT', 'MS') THEN ARRAY['isabela.nunes@farmarcas.com.br', 'marilia.duarte@farmarcas.com.br']
              ELSE ARRAY['debora.lins@farmarcas.com.br', 'tiago.moreira@farmarcas.com.br']
            END)[1 + g2.number % 2] AS email
      FROM economic_groups g2
      JOIN LATERAL (
        SELECT x.uf FROM stores x
         WHERE x.economic_group_id = g2.id AND x.deleted_at IS NULL
         ORDER BY x.code LIMIT 1
      ) s ON true
     WHERE g2.number >= 500 AND g2.number % 12 <> 0
  ) pick
 WHERE g.id = pick.id AND g.angel_employee_id IS NULL;

COMMIT;
