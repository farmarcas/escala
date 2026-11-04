import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import {
  actChangeRequestRequest,
  attachDocumentRequest,
  createChangeRequestRequest,
  listChangeRequestsRequest,
} from './change-requests/change-requests.schemas.js';
import { receiveFile } from './documents/upload.js';
import {
  catalogRequest,
  furnitureRequest,
  strategiesRequest,
} from './structure/structure.schemas.js';
import {
  addCustomEntryRequest,
  channelRequest,
  noExternalToolsRequest,
  removeCustomEntryRequest,
  toolRequest,
  updateCustomEntryRequest,
} from './structure/tools-channels.schemas.js';
import { storePageController as c } from './store-page.controller.js';
import {
  downloadDocumentRequest,
  getStoreRequest,
  historyRequest,
  remindStoreRequest,
  updateStoreRequest,
  uploadDocumentRequest,
  validateStoreRequest,
} from './store-page.schemas.js';

// Montado nos dois caminhos (/api/v1/backoffice e /api/v1/tenant). Quem pode o quê é
// decidido no service (permissions.ts) e o RLS limita o grupo às próprias lojas.
export const storePageRouter = () => {
  const router = Router();

  router.get('/stores/:code', validate(getStoreRequest), c.get);
  router.patch('/stores/:code', validate(updateStoreRequest), c.update);
  router.post('/stores/:code/validation', validate(validateStoreRequest), c.validate);
  router.post('/stores/:code/validation-reminders', validate(remindStoreRequest), c.remind);
  router.get('/stores/:code/history', validate(historyRequest), c.history);
  router.get('/catalog', validate(catalogRequest), c.catalog);
  router.put('/stores/:code/strategies', validate(strategiesRequest), c.setStrategies);
  router.put('/stores/:code/furniture/:itemId', validate(furnitureRequest), c.setFurniture);
  router.put('/stores/:code/tools/:itemId', validate(toolRequest), c.setTool);
  router.put('/stores/:code/channels/:itemId', validate(channelRequest), c.setChannel);
  router.put(
    '/stores/:code/no-external-tools',
    validate(noExternalToolsRequest),
    c.setNoExternalTools,
  );
  router.post('/stores/:code/custom-entries', validate(addCustomEntryRequest), c.addCustomEntry);
  router.patch(
    '/stores/:code/custom-entries/:entryId',
    validate(updateCustomEntryRequest),
    c.updateCustomEntry,
  );
  router.delete(
    '/stores/:code/custom-entries/:entryId',
    validate(removeCustomEntryRequest),
    c.removeCustomEntry,
  );

  router.get('/stores/:code/change-requests', validate(listChangeRequestsRequest), c.listRequests);
  router.post(
    '/stores/:code/change-requests',
    validate(createChangeRequestRequest),
    c.createRequest,
  );
  router.post('/change-requests/:id/actions', validate(actChangeRequestRequest), c.actOnRequest);
  router.post(
    '/change-requests/:id/documents',
    receiveFile,
    validate(attachDocumentRequest),
    c.attachToRequest,
  );

  router.get('/stores/:code/documents', validate(getStoreRequest), c.listDocuments);
  router.post(
    '/stores/:code/documents',
    receiveFile,
    validate(uploadDocumentRequest),
    c.uploadDocument,
  );
  router.get(
    '/stores/:code/documents/:documentId/file',
    validate(downloadDocumentRequest),
    c.downloadDocument,
  );

  return router;
};
