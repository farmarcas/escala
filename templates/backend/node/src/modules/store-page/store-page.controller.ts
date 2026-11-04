import type { Request, Response } from 'express';
import type { z } from 'zod';
import { readIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  actChangeRequestRequest,
  attachDocumentRequest,
  createChangeRequestRequest,
  listChangeRequestsRequest,
} from './change-requests/change-requests.schemas.js';
import { changeRequestsService } from './change-requests/change-requests.service.js';
import { documentsService } from './documents/documents.service.js';
import { requireFile } from './documents/upload.js';
import type {
  downloadDocumentRequest,
  getStoreRequest,
  historyRequest,
  remindStoreRequest,
  updateStoreRequest,
  uploadDocumentRequest,
  validateStoreRequest,
} from './store-page.schemas.js';
import { storePageService, toolsChannelsService } from './store-page.service.js';
import type {
  addCustomEntryRequest,
  channelRequest,
  noExternalToolsRequest,
  removeCustomEntryRequest,
  toolRequest,
  updateCustomEntryRequest,
} from './structure/tools-channels.schemas.js';
import type {
  catalogRequest,
  furnitureRequest,
  strategiesRequest,
} from './structure/structure.schemas.js';
import { structureService } from './structure/structure.service.js';

type Validated<T extends z.ZodType> = z.infer<T>;

export const storePageController = {
  async get(req: Request, res: Response) {
    const { params } = readValidated<Validated<typeof getStoreRequest>>(res);
    res.json(await storePageService.get(readIdentity(req), params.code));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof updateStoreRequest>>(res);
    res.json(await storePageService.update(readIdentity(req), params.code, body));
  },

  async validate(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof validateStoreRequest>>(res);
    res.json(await storePageService.validate(readIdentity(req), params.code, body.expectedVersion));
  },

  async catalog(req: Request, res: Response) {
    const { query } = readValidated<Validated<typeof catalogRequest>>(res);
    res.json(await structureService.catalog(readIdentity(req), query.kind));
  },

  async setStrategies(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof strategiesRequest>>(res);
    res.json(await storePageService.setStrategies(readIdentity(req), params.code, body.itemIds));
  },

  async setFurniture(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof furnitureRequest>>(res);
    res.json(
      await storePageService.setFurniture(
        readIdentity(req),
        params.code,
        params.itemId,
        body.quantity,
        body.tradeQuantity,
      ),
    );
  },

  async setTool(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof toolRequest>>(res);
    res.json(
      await storePageService.toolsAndChannels(
        readIdentity(req),
        params.code,
        (tx, store, permissions, actor) =>
          toolsChannelsService.setTool(
            tx,
            store,
            permissions,
            actor,
            params.itemId,
            body.uses,
            body.monthlyCostCents ?? null,
          ),
      ),
    );
  },

  async setChannel(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof channelRequest>>(res);
    res.json(
      await storePageService.toolsAndChannels(
        readIdentity(req),
        params.code,
        (tx, store, permissions, actor) =>
          toolsChannelsService.setChannel(
            tx,
            store,
            permissions,
            actor,
            params.itemId,
            body.uses,
            body.identifier ?? null,
          ),
      ),
    );
  },

  async setNoExternalTools(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof noExternalToolsRequest>>(res);
    res.json(
      await storePageService.toolsAndChannels(
        readIdentity(req),
        params.code,
        (tx, store, permissions, actor) =>
          toolsChannelsService.setNoExternalTools(tx, store, permissions, actor, body.value),
      ),
    );
  },

  async addCustomEntry(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof addCustomEntryRequest>>(res);
    res
      .status(201)
      .json(
        await storePageService.toolsAndChannels(
          readIdentity(req),
          params.code,
          (tx, store, permissions, actor) =>
            toolsChannelsService.addCustom(tx, store, permissions, actor, body),
        ),
      );
  },

  async updateCustomEntry(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof updateCustomEntryRequest>>(res);
    res.json(
      await storePageService.toolsAndChannels(
        readIdentity(req),
        params.code,
        (tx, store, permissions, actor) =>
          toolsChannelsService.updateCustom(tx, store, permissions, actor, params.entryId, body),
      ),
    );
  },

  async removeCustomEntry(req: Request, res: Response) {
    const { params } = readValidated<Validated<typeof removeCustomEntryRequest>>(res);
    res.json(
      await storePageService.toolsAndChannels(
        readIdentity(req),
        params.code,
        (tx, store, permissions, actor) =>
          toolsChannelsService.removeCustom(tx, store, permissions, actor, params.entryId),
      ),
    );
  },

  async remind(req: Request, res: Response) {
    const { params } = readValidated<Validated<typeof remindStoreRequest>>(res);
    res.json(await storePageService.remind(readIdentity(req), params.code));
  },

  async history(req: Request, res: Response) {
    const { params, query } = readValidated<Validated<typeof historyRequest>>(res);
    res.json(await storePageService.history(readIdentity(req), params.code, query));
  },

  async listRequests(req: Request, res: Response) {
    const { params, query } = readValidated<Validated<typeof listChangeRequestsRequest>>(res);
    res.json(await changeRequestsService.list(readIdentity(req), params.code, query.status));
  },

  async createRequest(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof createChangeRequestRequest>>(res);
    res.status(201).json(await changeRequestsService.create(readIdentity(req), params.code, body));
  },

  async actOnRequest(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof actChangeRequestRequest>>(res);
    res.json(
      await changeRequestsService.act(
        readIdentity(req),
        params.id,
        body.action,
        body.note,
        body.expectedVersion,
      ),
    );
  },

  async attachToRequest(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof attachDocumentRequest>>(res);
    res.json(
      await changeRequestsService.attach(
        readIdentity(req),
        params.id,
        body.docType,
        requireFile(req),
      ),
    );
  },

  async listDocuments(req: Request, res: Response) {
    const { params } = readValidated<Validated<typeof getStoreRequest>>(res);
    res.json(await documentsService.list(readIdentity(req), params.code));
  },

  async uploadDocument(req: Request, res: Response) {
    const { params, body } = readValidated<Validated<typeof uploadDocumentRequest>>(res);
    res
      .status(201)
      .json(
        await documentsService.upload(
          readIdentity(req),
          params.code,
          body.docType,
          body.validUntil || undefined,
          requireFile(req),
        ),
      );
  },

  async downloadDocument(req: Request, res: Response) {
    const { params } = readValidated<Validated<typeof downloadDocumentRequest>>(res);
    const file = await documentsService.download(readIdentity(req), params.code, params.documentId);
    res.setHeader('content-type', file.mimeType);
    res.setHeader(
      'content-disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.send(file.content);
  },
};
