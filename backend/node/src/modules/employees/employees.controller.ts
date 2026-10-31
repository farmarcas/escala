import type { Request, Response } from 'express';
import type { z } from 'zod';
import { sendCsv, toCsv } from '../../shared/http/csv.js';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  employeeFacetsRequest,
  createEmployeeRequest,
  employeeAuditRequest,
  employeeStatusRequest,
  getEmployeeRequest,
  listEmployeesRequest,
  updateEmployeeRequest,
} from './employees.schemas.js';
import { EMPLOYEE_CSV_COLUMNS } from './employees.csv.js';
import type { EmployeesService } from './employees.service.js';

export const makeEmployeesController = (service: EmployeesService) => ({
  async list(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listEmployeesRequest>>(res);
    const { page, pageSize, ...filter } = query;
    res.json(await service.list(readPlatformIdentity(req), filter, page, pageSize));
  },

  async exportCsv(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listEmployeesRequest>>(res);
    const { page: _page, pageSize: _pageSize, ...filter } = query;
    const rows = await service.exportRows(readPlatformIdentity(req), filter);
    sendCsv(res, 'funcionarios', toCsv(EMPLOYEE_CSV_COLUMNS, rows));
  },

  async facets(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof employeeFacetsRequest>>(res);
    const { field, page: _page, pageSize: _pageSize, ...filter } = query;
    res.json(await service.facets(readPlatformIdentity(req), field, filter));
  },

  async stats(req: Request, res: Response) {
    res.json(await service.stats(readPlatformIdentity(req)));
  },

  async get(req: Request, res: Response) {
    const { params } = readValidated<z.infer<typeof getEmployeeRequest>>(res);
    res.json(await service.get(readPlatformIdentity(req), params.id));
  },

  async create(req: Request, res: Response) {
    const { body } = readValidated<z.infer<typeof createEmployeeRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), body));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateEmployeeRequest>>(res);
    res.json(await service.update(readPlatformIdentity(req), params.id, body));
  },

  async changeStatus(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof employeeStatusRequest>>(res);
    res.json(await service.changeStatus(readPlatformIdentity(req), params.id, body));
  },

  async listAudit(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof employeeAuditRequest>>(res);
    res.json(
      await service.listAudit(readPlatformIdentity(req), params.id, query.page, query.pageSize),
    );
  },
});
