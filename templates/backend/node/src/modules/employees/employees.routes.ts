import { Router } from 'express';
import { requirePlatformRole } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { makeEmployeesController } from './employees.controller.js';
import { employeesRepository } from './employees.repository.js';
import {
  createEmployeeRequest,
  employeeAuditRequest,
  employeeStatsRequest,
  employeeStatusRequest,
  getEmployeeRequest,
  listEmployeesRequest,
  updateEmployeeRequest,
} from './employees.schemas.js';
import { makeEmployeesService, type EmployeesRepository } from './employees.service.js';

const adminOnly = requirePlatformRole('PLATFORM_ADMIN');

// Funcionários da Farmarcas (spec 003, US1). Os dois papéis consultam; só o administrador grava.
export const employeesRouter = (repo: EmployeesRepository = employeesRepository) => {
  const controller = makeEmployeesController(makeEmployeesService(repo));
  const router = Router();

  router.get('/', validate(listEmployeesRequest), controller.list);
  router.get('/stats', validate(employeeStatsRequest), controller.stats);
  router.get('/export', validate(listEmployeesRequest), controller.exportCsv);
  router.get('/:id', validate(getEmployeeRequest), controller.get);
  router.post('/', adminOnly, validate(createEmployeeRequest), controller.create);
  router.patch('/:id', adminOnly, validate(updateEmployeeRequest), controller.update);
  router.post('/:id/status', adminOnly, validate(employeeStatusRequest), controller.changeStatus);
  router.get('/:id/audit-events', validate(employeeAuditRequest), controller.listAudit);

  return router;
};
