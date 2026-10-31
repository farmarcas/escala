-- Dados de exemplo FICTÍCIOS: rede nacional com lojas nos 27 estados, para o Início (mapa)
-- e as listas parecerem com a rede real (~500 GEs e ~1.900 lojas). Só local/dev.
-- Depende das migrations do Backoffice (specs/001) e das marcas de 20261030000000_backoffice_exemplo.sql.
--
-- Os dados são gerados aqui mesmo, de forma determinística (md5 do número do GE ou do código da
-- loja), em vez de milhares de linhas escritas à mão. Rodar de novo não duplica nada:
-- IDs fixos derivados do número/código + ON CONFLICT DO NOTHING. O md5 vira um UUID válido
-- (versão 5, variante RFC) trocando dois caracteres, senão a API recusa o id.
-- As tabelas "seed_*" são temporárias deste script (somem no COMMIT); não mudam o schema.
-- Números dos GEs: 500 em diante. Códigos das lojas: 1001 em diante. CNPJs com dígito válido.
-- Proprietários são pessoas fictícias (e-mails @exemplo.com.br), cerca de 1 em cada 3 grupos,
-- como na carga inicial real, que não traz proprietários (Product Vision, gate D6).
BEGIN;

-- Rede por estado: lojas, grupos, parte dos grupos com proprietário, cidades (a capital primeiro,
-- as primeiras recebem mais lojas), marcas mais fortes na região e DDD.
CREATE TEMP TABLE seed_uf ON COMMIT DROP AS
SELECT t.*,
       (sum(t.groups) OVER (ORDER BY t.stores DESC, t.uf) - t.groups)::int AS group_offset,
       (sum(t.stores) OVER (ORDER BY t.stores DESC, t.uf) - t.stores)::int AS store_offset
  FROM (VALUES
  ('SP', 586, 162, 0.42, ARRAY['São Paulo','Campinas','Ribeirão Preto','Sorocaba','Santos','São José dos Campos','Guarulhos','Bauru','Piracicaba','Jundiaí'], ARRAY['Rede Aurora','Vitta Popular','FarmaNova','Mais Saúde'], '11'),
  ('MG', 341,  97, 0.37, ARRAY['Belo Horizonte','Juiz de Fora','Uberlândia','Montes Claros','Contagem','Uberaba','Ipatinga','Varginha'], ARRAY['Bem Viver','Mais Saúde','Rede Aurora'], '31'),
  ('PR', 252,  68, 0.35, ARRAY['Curitiba','Londrina','Maringá','Cascavel','Ponta Grossa','Foz do Iguaçu','São José dos Pinhais'], ARRAY['Vitta Popular','FarmaNova','Bem Viver'], '41'),
  ('GO', 171,  46, 0.38, ARRAY['Goiânia','Anápolis','Aparecida de Goiânia','Rio Verde','Catalão','Jataí'], ARRAY['Rede Aurora','Mais Saúde','FarmaNova'], '62'),
  ('RS', 139,  39, 0.33, ARRAY['Porto Alegre','Caxias do Sul','Pelotas','Santa Maria','Passo Fundo','Novo Hamburgo'], ARRAY['Pharmavale','Popular Sul','Bem Viver'], '51'),
  ('SC',  74,  21, 0.40, ARRAY['Florianópolis','Joinville','Blumenau','Chapecó','Criciúma','Itajaí'], ARRAY['Vitta Popular','Pharmavale','Popular Sul'], '48'),
  ('RJ',  58,  17, 0.36, ARRAY['Rio de Janeiro','Niterói','Petrópolis','Campos dos Goytacazes','Nova Iguaçu','Volta Redonda'], ARRAY['Farmaclin','FarmaNova','Bem Viver'], '21'),
  ('BA',  47,  13, 0.39, ARRAY['Salvador','Feira de Santana','Vitória da Conquista','Ilhéus','Juazeiro'], ARRAY['Farmaclin','Mais Saúde','Popular Sul'], '71'),
  ('CE',  40,  11, 0.37, ARRAY['Fortaleza','Juazeiro do Norte','Sobral','Caucaia'], ARRAY['Popular Sul','Farmaclin'], '85'),
  ('DF',  30,   8, 0.38, ARRAY['Brasília','Taguatinga','Ceilândia','Águas Claras'], ARRAY['Rede Aurora','Mais Saúde','FarmaNova'], '61'),
  ('ES',  26,   7, 0.30, ARRAY['Vitória','Vila Velha','Serra','Cachoeiro de Itapemirim'], ARRAY['Bem Viver','Farmaclin'], '27'),
  ('MT',  22,   6, 0.34, ARRAY['Cuiabá','Várzea Grande','Rondonópolis','Sinop'], ARRAY['Mais Saúde','Rede Aurora'], '65'),
  ('PE',  18,   5, 0.40, ARRAY['Recife','Olinda','Caruaru','Petrolina'], ARRAY['Farmaclin','Popular Sul'], '81'),
  ('RO',  16,   2, 0.50, ARRAY['Porto Velho','Ji-Paraná','Ariquemes','Candeias do Jamari'], ARRAY['Popular Sul','Mais Saúde'], '69'),
  ('MS',  15,   4, 0.25, ARRAY['Campo Grande','Dourados','Três Lagoas'], ARRAY['Mais Saúde','Rede Aurora'], '67'),
  ('PA',  14,   4, 0.25, ARRAY['Belém','Ananindeua','Santarém','Marabá'], ARRAY['Popular Sul','Farmaclin'], '91'),
  ('AM',  12,   3, 0.34, ARRAY['Manaus','Parintins','Itacoatiara'], ARRAY['Popular Sul','Farmaclin'], '92'),
  ('AC',  10,   1, 0.00, ARRAY['Rio Branco','Cruzeiro do Sul','Sena Madureira'], ARRAY['Popular Sul'], '68'),
  ('MA',   9,   3, 0.34, ARRAY['São Luís','Imperatriz','Caxias'], ARRAY['Farmaclin','Mais Saúde'], '98'),
  ('PB',   8,   3, 0.34, ARRAY['João Pessoa','Campina Grande'], ARRAY['Farmaclin'], '83'),
  ('RN',   8,   2, 0.50, ARRAY['Natal','Mossoró'], ARRAY['Popular Sul','Farmaclin'], '84'),
  ('AL',   6,   2, 0.50, ARRAY['Maceió','Arapiraca'], ARRAY['Farmaclin'], '82'),
  ('PI',   6,   2, 0.00, ARRAY['Teresina','Parnaíba'], ARRAY['Mais Saúde'], '86'),
  ('SE',   5,   2, 0.50, ARRAY['Aracaju','Lagarto'], ARRAY['Farmaclin'], '79'),
  ('TO',   5,   2, 0.00, ARRAY['Palmas','Araguaína'], ARRAY['Mais Saúde'], '63'),
  ('AP',   3,   1, 1.00, ARRAY['Macapá','Santana'], ARRAY['Farmaclin'], '96'),
  ('RR',   2,   1, 0.00, ARRAY['Boa Vista'], ARRAY['Popular Sul'], '95')
) AS t(uf, stores, groups, owner_share, cities, brands, ddd);

-- Sorteios determinísticos em [0, 1): md5 de um texto fixo, 28 bits, dividido por 2^28.

-- Grupos: número 500 + posição global; nome = substantivo × complemento (sem repetir).
CREATE TEMP TABLE seed_group ON COMMIT DROP AS
WITH numbered AS (
  SELECT u.*, g AS local_index, u.group_offset + g AS global_index
    FROM seed_uf u, generate_series(1, u.groups) AS g
),
words AS (
  SELECT ARRAY['Aurora','Bandeirantes','Tietê','Cantareira','Mantiqueira','Paranapanema','Araucária','Iguaçu',
               'Cerrado','Pampa','Guaíba','Itajaí','Guanabara','Recôncavo','Jaguaribe','Planalto','Capixaba',
               'Pantanal','Capibaribe','Madeira','Tapajós','Solimões','Juruá','Itapecuru','Borborema','Potengi',
               'Mundaú','Parnaíba','Sergipe','Tocantins','Oiapoque','Roraima','Horizonte','Ipê','Jacarandá',
               'Sabiá','Jequitibá','Cambuí','Mirante','Alvorada'] AS nouns,
         ARRAY['', ' do Vale', ' Central', ' Popular', ' da Serra', ' do Sul', ' do Norte', ' Nova', ' Saúde',
               ' Bem-Estar', ' Vida', ' Farma', ' Sempre'] AS quals,
         ARRAY['Comércio de Medicamentos Ltda','Drogarias Ltda','Farmácias S/A','Comércio Farmacêutico Ltda',
               'Drogaria e Perfumaria Ltda'] AS legal
)
SELECT n.uf, n.local_index, n.global_index,
       500 + n.global_index AS number,
       overlay(overlay(md5('seed-rede-ge-' || (500 + n.global_index)) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid AS id,
       w.nouns[1 + (n.global_index - 1) % 40]
         || w.quals[1 + ((n.global_index - 1) / 40) % 13] AS short_name,
       w.legal[1 + n.global_index % 5] AS legal_suffix,
       -- base do CNPJ (8 dígitos), única por grupo: 7919 é primo com 10^8
       lpad((((500 + n.global_index)::bigint * 7919 + 13579) % 100000000)::text, 8, '0') AS cnpj_base,
       (('x' || substr(md5('seed-ge-status-' || n.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u_status,
       (('x' || substr(md5('seed-ge-owner-' || n.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u_owner,
       (('x' || substr(md5('seed-ge-brand-' || n.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u_brand,
       (('x' || substr(md5('seed-ge-date-' || n.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u_date,
       n.owner_share, n.brands, n.ddd
  FROM numbered n, words w;

-- Lojas: as primeiras N vão uma para cada grupo; o resto se concentra nos primeiros grupos
-- (poucos grupos grandes e muitos pequenos, como na rede real).
CREATE TEMP TABLE seed_store ON COMMIT DROP AS
WITH raw AS (
  SELECT u.uf, u.groups, u.cities, u.brands, i AS local_index, u.store_offset + i AS global_index
    FROM seed_uf u, generate_series(1, u.stores) AS i
),
rolled AS (
  SELECT r.*,
         (('x' || substr(md5('seed-lj-a-' || r.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u1,
         (('x' || substr(md5('seed-lj-b-' || r.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u2,
         (('x' || substr(md5('seed-lj-c-' || r.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u3,
         (('x' || substr(md5('seed-lj-d-' || r.global_index), 1, 7))::bit(28)::int / 268435456.0) AS u4
    FROM raw r
),
placed AS (
  SELECT s.*,
         CASE WHEN s.local_index <= s.groups THEN s.local_index
              ELSE 1 + floor(s.groups * power(s.u1, 2.4))::int END AS group_local
    FROM rolled s
)
SELECT p.*, g.id AS group_id, g.number AS group_number, g.short_name, g.cnpj_base, g.u_brand,
       row_number() OVER (PARTITION BY g.number ORDER BY p.global_index) AS branch,
       count(*) OVER (PARTITION BY g.number) AS group_size
  FROM placed p
  JOIN seed_group g ON g.uf = p.uf AND g.local_index = p.group_local;

-- CNPJ completo (base + filial + 2 dígitos verificadores).
CREATE TEMP TABLE seed_cnpj ON COMMIT DROP AS
WITH twelve AS (
  SELECT DISTINCT cnpj_base || lpad(branch::text, 4, '0') AS body FROM seed_store
  UNION
  SELECT cnpj_base || '0001' FROM seed_group
),
d1 AS (
  SELECT t.body,
         (SELECT sum(substr(t.body, k, 1)::int * (ARRAY[5,4,3,2,9,8,7,6,5,4,3,2])[k])
            FROM generate_series(1, 12) k) % 11 AS r
    FROM twelve t
),
with_d1 AS (
  SELECT body || CASE WHEN r < 2 THEN 0 ELSE 11 - r END AS body13 FROM d1
),
d2 AS (
  SELECT w.body13,
         (SELECT sum(substr(w.body13, k, 1)::int * (ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2])[k])
            FROM generate_series(1, 13) k) % 11 AS r
    FROM with_d1 w
)
SELECT substr(body13, 1, 12) AS body, body13 || CASE WHEN r < 2 THEN 0 ELSE 11 - r END AS cnpj FROM d2;

INSERT INTO economic_groups (id, number, name, legal_name, cnpj, status, created_at, updated_at)
SELECT g.id, g.number, 'Grupo ' || g.short_name, g.short_name || ' ' || g.legal_suffix, c.cnpj,
       (CASE WHEN g.u_status < 0.03 THEN 'SUSPENDED' WHEN g.u_status < 0.05 THEN 'ARCHIVED' ELSE 'ACTIVE' END)::group_status,
       timestamptz '2024-01-15 12:00:00-03' + g.u_date * interval '900 days',
       timestamptz '2024-01-15 12:00:00-03' + g.u_date * interval '900 days'
  FROM seed_group g
  JOIN seed_cnpj c ON c.body = g.cnpj_base || '0001'
ON CONFLICT DO NOTHING;

INSERT INTO group_owners (id, economic_group_id, name, email, phone, pseudonym, created_at, updated_at)
SELECT overlay(overlay(md5('seed-rede-owner-' || g.number) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid, g.id,
       (ARRAY['Ana','Bruno','Camila','Diego','Elaine','Fábio','Gabriela','Henrique','Isabela','João',
              'Larissa','Marcelo','Natália','Otávio','Patrícia','Renato','Simone','Tiago','Vanessa','Wagner'])[1 + g.number % 20]
         || ' ' ||
       (ARRAY['Almeida','Barbosa','Cardoso','Duarte','Esteves','Ferreira','Gonçalves','Lima','Macedo','Nogueira',
              'Oliveira','Pereira','Queiroz','Ribeiro','Santana','Teixeira','Vasconcelos','Xavier','Zanetti','Moura'])[1 + (g.number / 20) % 20],
       'proprietario.ge' || g.number || '@exemplo.com.br',
       g.ddd || '9' || lpad((g.number * 4721 % 100000000)::text, 8, '0'),
       -- 5 dígitos hexadecimais distintos por número (104729 é primo com 2^20)
       'F-' || upper(lpad(to_hex((g.number * 104729) % 1048576), 5, '0')),
       timestamptz '2024-01-15 12:00:00-03' + g.u_date * interval '900 days',
       timestamptz '2024-01-15 12:00:00-03' + g.u_date * interval '900 days'
  FROM seed_group g
 WHERE g.u_owner < g.owner_share
ON CONFLICT DO NOTHING;

INSERT INTO stores (id, code, economic_group_id, brand_id, name, type, cnpj, street, number, district,
                    city, uf, opened_at, status, validated_at, validated_by, created_at, updated_at)
SELECT overlay(overlay(md5('seed-rede-lj-' || (1000 + s.global_index)) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid,
       1000 + s.global_index,
       s.group_id,
       b.id,
       CASE WHEN is_cd THEN 'CD ' || s.short_name || ' ' || city
            ELSE 'Drogaria ' || s.short_name || ' ' || district END,
       (CASE WHEN is_cd THEN 'CD' ELSE 'PDV' END)::store_type,
       c.cnpj,
       (ARRAY['Rua Sete de Setembro','Av. Brasil','Rua XV de Novembro','Av. Getúlio Vargas','Rua Tiradentes',
              'Av. Santos Dumont','Rua Dom Pedro II','Av. Presidente Vargas','Rua São Paulo','Rua Rio Branco',
              'Av. Independência','Rua Marechal Deodoro'])[1 + floor(s.u3 * 12)::int],
       (1 + floor(s.u4 * 3000)::int)::text,
       district,
       city,
       s.uf,
       date '2008-01-01' + floor(s.u2 * 6800)::int,
       (CASE WHEN s.u4 < 0.06 THEN 'INACTIVE' WHEN s.u4 < 0.12 THEN 'PENDING' ELSE 'ACTIVE' END)::store_status,
       CASE WHEN s.u3 < 0.40 THEN now() - s.u1 * interval '150 days'
            WHEN s.u3 < 0.65 THEN now() - interval '200 days' - s.u1 * interval '400 days' END,
       CASE WHEN s.u3 < 0.65 THEN 'OP-02' END,
       (date '2008-01-01' + floor(s.u2 * 6800)::int)::timestamptz + interval '12 hours',
       (date '2008-01-01' + floor(s.u2 * 6800)::int)::timestamptz + interval '12 hours'
  FROM (
    SELECT s.*,
           -- grupo com 12 lojas ou mais tem a última como centro de distribuição
           (s.group_size >= 12 AND s.branch = s.group_size) AS is_cd,
           s.cities[1 + floor(power(s.u2, 1.7) * array_length(s.cities, 1))::int] AS city,
           (ARRAY['Centro','Jardim América','Vila Nova','Boa Vista','Santa Cruz','São José','Bela Vista',
                  'Liberdade','Jardim Paulista','Cidade Alta','Industrial','Primavera','Esplanada','Aeroporto',
                  'Santo Antônio','Nossa Senhora das Graças','Vila Operária','Parque das Flores'])[1 + floor(s.u3 * 18)::int] AS district,
           -- 4 em cada 5 lojas usam a marca principal do grupo
           CASE WHEN s.u1 < 0.8
                THEN s.brands[1 + floor(power(s.u_brand, 1.6) * array_length(s.brands, 1))::int]
                ELSE s.brands[1 + floor(s.u4 * array_length(s.brands, 1))::int] END AS brand_name
      FROM seed_store s
  ) s
  -- Se a marca escolhida foi excluída ou desativada na tela, usa outra marca ativa.
  JOIN LATERAL (
    SELECT id FROM brands
     WHERE deleted_at IS NULL AND status = 'ACTIVE'
     ORDER BY (name = s.brand_name) DESC, name
     LIMIT 1
  ) b ON true
  JOIN seed_cnpj c ON c.body = s.cnpj_base || lpad(s.branch::text, 4, '0')
ON CONFLICT DO NOTHING;

INSERT INTO audit_events (id, economic_group_id, entity_type, entity_id, action, summary, actor_subject, actor_role, justification, created_at)
SELECT overlay(overlay(md5('seed-rede-audit-' || g.number) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid, g.id, 'GROUP', g.id, 'GROUP_CREATED',
       'Grupo cadastrado na carga inicial', 'OP-02', 'PLATFORM_ADMIN', NULL,
       timestamptz '2024-01-15 12:00:00-03' + g.u_date * interval '900 days'
  FROM seed_group g
ON CONFLICT DO NOTHING;

-- Próximos números emitidos continuam depois dos já usados.
SELECT setval(pg_get_serial_sequence('economic_groups', 'number'), GREATEST((SELECT max(number) FROM economic_groups), 1));
SELECT setval(pg_get_serial_sequence('stores', 'code'), GREATEST((SELECT max(code) FROM stores), 1));

COMMIT;
