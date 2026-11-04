import { z } from 'zod';
import { onlyDigits } from '../../shared/br/cnpj.js';
import {
  paginationShape,
  requestSchema,
  searchQuery,
  uuidParam,
} from '../../shared/http/request-schemas.js';
import { listOf, uuidListOf } from '../../shared/http/list-filters.js';

export const employeeStatusSchema = z.enum(['ACTIVE', 'TERMINATED']);
export type EmployeeStatusValue = z.infer<typeof employeeStatusSchema>;

export const genderSchema = z.enum(['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED']);
export const suiteSystemSchema = z.enum(['BACKOFFICE', 'GESTAO_360', 'ESCALA']);
export const suiteRoleSchema = z.enum(['ADMIN', 'MANAGER', 'ANALYST']);

// Filtro "Sistema e papel": BACKOFFICE:ADMIN, ... ou NONE (sem nenhum acesso).
export const NO_ACCESS = 'NONE';
export const ACCESS_VALUES = [
  ...suiteSystemSchema.options.flatMap((system) =>
    suiteRoleSchema.options.map((role) => `${system}:${role}` as const),
  ),
  NO_ACCESS,
] as const;

// Celular obrigatório (11 dígitos) e fixo opcional (10 dígitos), sempre com DDD (spec 005, FR-002).
const mobileSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^\d{11}$/, 'Celular deve ter DDD e 9 dígitos'));
const landlineSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^(\d{10})?$/, 'Telefone fixo deve ter DDD e 8 dígitos'))
  .transform((value) => value || null);

const employeeFields = {
  name: z.string().trim().min(3, 'Informe o nome completo').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  gender: genderSchema.nullable().optional(),
  mobile: mobileSchema,
  landline: landlineSchema.nullable().optional(),
  departmentId: z.string().uuid('Escolha o departamento'),
  occupationId: z.string().uuid('Escolha a ocupação'),
};

export const createEmployeeSchema = z.object(employeeFields).strict();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    version: z.number().int().positive(),
    name: employeeFields.name.optional(),
    email: employeeFields.email.optional(),
    gender: employeeFields.gender,
    mobile: employeeFields.mobile.optional(),
    landline: employeeFields.landline,
    departmentId: employeeFields.departmentId.optional(),
    occupationId: employeeFields.occupationId.optional(),
  })
  .strict();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const employeeStatusChangeSchema = z
  .object({
    action: z.enum(['terminate', 'rehire']),
    justification: z.string().trim().min(5, 'Explique o motivo').max(500),
  })
  .strict();
export type EmployeeStatusChangeInput = z.infer<typeof employeeStatusChangeSchema>;

export const listEmployeesQuery = z
  .object({
    ...paginationShape,
    search: searchQuery,
    // "+ Filtro": cada campo aceita vários valores separados por vírgula.
    department: uuidListOf(),
    access: listOf(ACCESS_VALUES),
    status: listOf(employeeStatusSchema.options),
  })
  .strict();
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuery>;
export type EmployeeFilter = Omit<ListEmployeesQuery, 'page' | 'pageSize'>;

export const listEmployeesRequest = requestSchema({ query: listEmployeesQuery });
export const EMPLOYEE_FACET_FIELDS = ['department', 'access', 'status'] as const;
export type EmployeeFacetField = (typeof EMPLOYEE_FACET_FIELDS)[number];
export const employeeFacetsRequest = requestSchema({
  query: listEmployeesQuery.extend({ field: z.enum(EMPLOYEE_FACET_FIELDS) }),
});
export const employeeStatsRequest = requestSchema({});
export const employeeOptionsRequest = requestSchema({});
export const getEmployeeRequest = requestSchema({ params: uuidParam });
export const createEmployeeRequest = requestSchema({ body: createEmployeeSchema });
export const updateEmployeeRequest = requestSchema({
  body: updateEmployeeSchema,
  params: uuidParam,
});
export const employeeStatusRequest = requestSchema({
  body: employeeStatusChangeSchema,
  params: uuidParam,
});
export const employeeAccessRequest = requestSchema({
  params: z.object({ id: z.string().uuid(), system: suiteSystemSchema }).strict(),
  body: z.object({ role: suiteRoleSchema.nullable() }).strict(),
});
export const employeeAuditRequest = requestSchema({
  params: uuidParam,
  query: z.object(paginationShape).strict(),
});
