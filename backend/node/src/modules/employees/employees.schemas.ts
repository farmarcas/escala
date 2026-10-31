import { z } from 'zod';
import { onlyDigits } from '../../shared/br/cnpj.js';
import {
  paginationShape,
  requestSchema,
  searchQuery,
  uuidParam,
} from '../../shared/http/request-schemas.js';
import { listOf } from '../../shared/http/list-filters.js';

// Áreas da Farmarcas: a mesma lista do Gestão 360 (spec 003, FR-011).
export const employeeAreaSchema = z.enum([
  'COMMERCIAL',
  'MEMBER_FINANCE',
  'TRADE',
  'DIGITAL_PRODUCTS',
  'MEMBER_SUCCESS',
  'OPERATIONS',
]);
export type EmployeeAreaValue = z.infer<typeof employeeAreaSchema>;

export const employeeAccessRoleSchema = z.enum(['PLATFORM_ADMIN', 'PLATFORM_ANALYST', 'NONE']);
export type EmployeeAccessRoleValue = z.infer<typeof employeeAccessRoleSchema>;

export const employeeStatusSchema = z.enum(['ACTIVE', 'TERMINATED']);
export type EmployeeStatusValue = z.infer<typeof employeeStatusSchema>;

// Telefone opcional: vazio vira "sem telefone".
const phoneSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^(\d{10,11})?$/, 'Telefone deve ter DDD e 8 ou 9 dígitos'))
  .transform((value) => value || null);

const employeeFields = {
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  phone: phoneSchema.nullable().optional(),
  area: employeeAreaSchema,
  jobTitle: z.string().trim().min(2).max(80),
  accessRole: employeeAccessRoleSchema,
};

export const createEmployeeSchema = z.object(employeeFields).strict();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    name: employeeFields.name.optional(),
    email: employeeFields.email.optional(),
    phone: employeeFields.phone,
    area: employeeFields.area.optional(),
    jobTitle: employeeFields.jobTitle.optional(),
    accessRole: employeeFields.accessRole.optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo',
  });
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
    area: listOf(employeeAreaSchema.options),
    accessRole: listOf(employeeAccessRoleSchema.options),
    status: listOf(employeeStatusSchema.options),
  })
  .strict();
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuery>;
export type EmployeeFilter = Omit<ListEmployeesQuery, 'page' | 'pageSize'>;

export const listEmployeesRequest = requestSchema({ query: listEmployeesQuery });
export const EMPLOYEE_FACET_FIELDS = ['area', 'accessRole', 'status'] as const;
export type EmployeeFacetField = (typeof EMPLOYEE_FACET_FIELDS)[number];
export const employeeFacetsRequest = requestSchema({
  query: listEmployeesQuery.extend({ field: z.enum(EMPLOYEE_FACET_FIELDS) }),
});
export const employeeStatsRequest = requestSchema({});
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
export const employeeAuditRequest = requestSchema({
  params: uuidParam,
  query: z.object(paginationShape).strict(),
});
