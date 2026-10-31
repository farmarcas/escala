-- Dados de exemplo FICTÍCIOS: funcionários da Farmarcas e o Anjo de cada grupo (spec 003, US1/US2).
-- Só local/dev. Depende da migration backoffice_fase2_p1 e dos grupos dos seeds anteriores.
-- Idempotente: IDs fixos (md5 do e-mail, ajustado para UUID válido) + ON CONFLICT DO NOTHING; o Anjo só é definido onde o
-- grupo ainda não tem um, para não desfazer o que foi escolhido na tela.
BEGIN;

INSERT INTO farmarcas_employees (id, name, email, phone, area, job_title, access_role, status, terminated_at, created_at, updated_at)
SELECT overlay(overlay(md5('seed-func-' || e.email) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid, e.name, e.email, e.phone, e.area::employee_area, e.job_title,
       e.access_role::employee_access_role, e.status::employee_status,
       CASE WHEN e.status = 'TERMINATED' THEN timestamptz '2026-08-29 18:00:00-03' END,
       timestamptz '2024-02-01 09:00:00-03', timestamptz '2024-02-01 09:00:00-03'
  FROM (VALUES
    ('Juliana Prado',   'juliana.prado@farmarcas.com.br',   '11900007781', 'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'ACTIVE'),
    ('Isabela Nunes',   'isabela.nunes@farmarcas.com.br',   '41900003320', 'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'ACTIVE'),
    ('Marília Duarte',  'marilia.duarte@farmarcas.com.br',  '31900004415', 'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'ACTIVE'),
    ('Rafael Quintana', 'rafael.quintana@farmarcas.com.br', '11900006692', 'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'ACTIVE'),
    ('Débora Lins',     'debora.lins@farmarcas.com.br',     '81900002204', 'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'ACTIVE'),
    ('Tiago Moreira',   'tiago.moreira@farmarcas.com.br',   '51900008817', 'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'ACTIVE'),
    ('Renata Alves',    'renata.alves@farmarcas.com.br',    '11900001150', 'MEMBER_SUCCESS',   'Supervisora de relacionamento',   'PLATFORM_ANALYST', 'ACTIVE'),
    ('Bruno Castro',    'bruno.castro@farmarcas.com.br',    '11900009934', 'MEMBER_SUCCESS',   'Gerente de sucesso do associado', 'PLATFORM_ADMIN',   'ACTIVE'),
    ('Luana Ferraz',    'luana.ferraz@farmarcas.com.br',    NULL,          'COMMERCIAL',       'Coordenadora comercial',          'PLATFORM_ANALYST', 'ACTIVE'),
    ('Paulo Sardinha',  'paulo.sardinha@farmarcas.com.br',  NULL,          'MEMBER_FINANCE',   'Analista financeiro',             'NONE',             'ACTIVE'),
    ('Camila Rezende',  'camila.rezende@farmarcas.com.br',  NULL,          'TRADE',            'Analista de trade marketing',     'NONE',             'ACTIVE'),
    ('Gustavo Pires',   'gustavo.pires@farmarcas.com.br',   '11900005508', 'DIGITAL_PRODUCTS', 'Gerente de produtos digitais',    'PLATFORM_ADMIN',   'ACTIVE'),
    ('Sérgio Matos',    'sergio.matos@farmarcas.com.br',    NULL,          'OPERATIONS',       'Coordenador de operações',        'PLATFORM_ANALYST', 'ACTIVE'),
    ('Helena Vidal',    'helena.vidal@farmarcas.com.br',    NULL,          'MEMBER_SUCCESS',   'Analista de relacionamento',      'PLATFORM_ANALYST', 'TERMINATED')
  ) AS e(name, email, phone, area, job_title, access_role, status)
ON CONFLICT DO NOTHING;

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
