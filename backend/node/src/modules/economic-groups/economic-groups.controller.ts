import type { Request, Response } from 'express';
import type { z } from 'zod';
import { sendCsv, toCsv } from '../../shared/http/csv.js';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  benefitCardRequest,
  bulkAngelRequest,
  createGroupRequest,
  getGroupRequest,
  groupFacetsRequest,
  listGroupAuditRequest,
  listGroupsRequest,
  ownerTransferRequest,
  setAngelRequest,
  statusChangeRequest,
  updateGroupRequest,
} from './economic-groups.schemas.js';
import { GROUP_CSV_COLUMNS } from './economic-groups.csv.js';
import type { EconomicGroupsService } from './economic-groups.service.js';

export const makeEconomicGroupsController = (service: EconomicGroupsService) => ({
  async list(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listGroupsRequest>>(res);
    res.json(await service.list(readPlatformIdentity(req), query));
  },

  async exportCsv(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listGroupsRequest>>(res);
    const rows = await service.exportRows(readPlatformIdentity(req), query);
    sendCsv(res, 'grupos', toCsv(GROUP_CSV_COLUMNS, rows));
  },

  async facets(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof groupFacetsRequest>>(res);
    const { field, ...filters } = query;
    res.json(await service.facets(readPlatformIdentity(req), field, filters));
  },

  async stats(req: Request, res: Response) {
    res.json(await service.stats(readPlatformIdentity(req)));
  },

  async get(req: Request, res: Response) {
    const { params } = readValidated<z.infer<typeof getGroupRequest>>(res);
    res.json(await service.get(readPlatformIdentity(req), params.number));
  },

  async create(req: Request, res: Response) {
    const { body } = readValidated<z.infer<typeof createGroupRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), body));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateGroupRequest>>(res);
    res.json(await service.update(readPlatformIdentity(req), params.number, body));
  },

  async changeStatus(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof statusChangeRequest>>(res);
    res.json(await service.changeStatus(readPlatformIdentity(req), params.number, body));
  },

  async setAngel(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof setAngelRequest>>(res);
    res.json(await service.setAngel(readPlatformIdentity(req), params.number, body));
  },

  async bulkAngel(req: Request, res: Response) {
    const { body } = readValidated<z.infer<typeof bulkAngelRequest>>(res);
    res.json(await service.bulkAngel(readPlatformIdentity(req), body));
  },

  async transferOwner(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof ownerTransferRequest>>(res);
    res.json(await service.transferOwner(readPlatformIdentity(req), params.number, body));
  },

  async setBenefitCard(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof benefitCardRequest>>(res);
    res.json(await service.setBenefitCard(readPlatformIdentity(req), params.number, body));
  },

  async listAudit(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof listGroupAuditRequest>>(res);
    res.json(
      await service.listAudit(readPlatformIdentity(req), params.number, query.page, query.pageSize),
    );
  },
});
