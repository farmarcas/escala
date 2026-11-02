import { Router } from 'express';
import { adminOnly } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { employeesController as controller } from './employees.controller.js';
import {
  createEmployeeRequest,
  employeeAccessRequest,
  employeeAuditRequest,
  employeeFacetsRequest,
  employeeOptionsRequest,
  employeeStatsRequest,
  employeeStatusRequest,
  getEmployeeRequest,
  listEmployeesRequest,
  updateEmployeeRequest,
} from './employees.schemas.js';

// Funcionários da Farmarcas (specs 003 e 005). Os três papéis da plataforma consultam; só o
// administrador cadastra, altera, desliga e dá acesso aos sistemas.
export const employeesRouter = () => {
  const router = Router();

  router.get('/', validate(listEmployeesRequest), controller.list);
  router.get('/stats', validate(employeeStatsRequest), controller.stats);
  router.get('/facets', validate(employeeFacetsRequest), controller.facets);
  router.get('/options', validate(employeeOptionsRequest), controller.options);
  router.get('/export', validate(listEmployeesRequest), controller.exportCsv);
  router.get('/:id', validate(getEmployeeRequest), controller.get);
  router.post('/', adminOnly, validate(createEmployeeRequest), controller.create);
  router.patch('/:id', adminOnly, validate(updateEmployeeRequest), controller.update);
  router.post('/:id/status', adminOnly, validate(employeeStatusRequest), controller.changeStatus);
  router.put(
    '/:id/accesses/:system',
    adminOnly,
    validate(employeeAccessRequest),
    controller.setAccess,
  );
  router.get('/:id/audit-events', validate(employeeAuditRequest), controller.listAudit);

  return router;
};
