import { withActor, type Tx } from '../../../shared/database/with-actor.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ForbiddenError } from '../../../shared/errors/forbidden-error.js';
import { NotFoundError } from '../../../shared/errors/not-found-error.js';
import type { Identity } from '../../../shared/identity/identity.js';
import { documentStatus } from '../completeness.js';
import { DOCUMENT_LABELS } from '../fields.js';
import { actorLabel } from '../presenters.js';
import { addHistory, currentDocuments, refreshCompleteness } from '../store-page.repository.js';
import { historyActor, loadStore, ownerOf } from '../store-page.service.js';

export type UploadedFile = { name: string; mime: string; content: Buffer; size: number };

const STORE_DOC_TYPES = [
  'CNPJ_CARD',
  'OPERATING_PERMIT',
  'SANITARY_LICENSE',
  'AFE',
  'CRF',
  'ASSOCIATION_CONTRACT',
];

const toDate = (value: string | undefined) => (value ? new Date(`${value}T00:00:00.000Z`) : null);

// Grava o arquivo e devolve o id do documento (usado também pelas solicitações).
export const storeFile = async (
  tx: Tx,
  identity: Identity,
  data: {
    storeId: string;
    economicGroupId: string;
    docType: string;
    requestId: string | null;
    validUntil: Date | null;
    file: UploadedFile;
  },
) => {
  const document = await tx.storeDocument.create({
    data: {
      storeId: data.storeId,
      economicGroupId: data.economicGroupId,
      docType: data.docType as 'CNPJ_CARD',
      requestId: data.requestId,
      fileName: data.file.name,
      mimeType: data.file.mime,
      sizeBytes: data.file.size,
      validUntil: data.validUntil,
      uploadedByKind: identity.kind === 'platform' ? 'PLATFORM' : 'TENANT',
      uploadedBy: identity.subject,
    },
    select: { id: true },
  });
  await tx.storeDocumentFile.create({
    data: { documentId: document.id, content: new Uint8Array(data.file.content) },
  });
  return document.id;
};

export const documentsService = {
  list(identity: Identity, code: number) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      const docs = await currentDocuments(tx, store.id);
      const today = new Date();
      const owner = ownerOf(store);
      return {
        data: STORE_DOC_TYPES.map((docType) => {
          const doc = docs.find((item) => item.docType === docType);
          return {
            docType,
            label: DOCUMENT_LABELS[docType] ?? docType,
            canUpload: permissions.uploadableDocuments.includes(docType),
            status: doc ? documentStatus(doc.validUntil, today) : 'missing',
            document: doc
              ? {
                  id: doc.id,
                  fileName: doc.fileName,
                  sizeBytes: doc.sizeBytes,
                  validUntil: doc.validUntil ? doc.validUntil.toISOString().slice(0, 10) : null,
                  uploadedAt: doc.createdAt,
                  uploadedBy: actorLabel(
                    {
                      kind: doc.uploadedByKind,
                      subject: doc.uploadedBy,
                      role: doc.uploadedByKind === 'PLATFORM' ? 'PLATFORM_ADMIN' : 'TENANT_ADMIN',
                    },
                    viewer,
                    owner,
                  ),
                }
              : null,
          };
        }),
      };
    });
  },

  upload(
    identity: Identity,
    code: number,
    docType: string,
    validUntil: string | undefined,
    file: UploadedFile,
  ) {
    return withActor(identity, async (tx) => {
      const { store, permissions } = await loadStore(tx, identity, code);
      if (!permissions.uploadableDocuments.includes(docType)) {
        throw new ForbiddenError(
          'Este documento é enviado pelo outro lado',
          'DOCUMENT_NOT_ALLOWED',
        );
      }
      // O novo arquivo substitui o anterior do mesmo tipo (que fica guardado).
      await tx.storeDocument.updateMany({
        where: {
          storeId: store.id,
          docType: docType as 'CNPJ_CARD',
          supersededAt: null,
          requestId: null,
        },
        data: { supersededAt: new Date() },
      });
      const id = await storeFile(tx, identity, {
        storeId: store.id,
        economicGroupId: store.economicGroupId,
        docType,
        requestId: null,
        validUntil: toDate(validUntil),
        file,
      });
      await addHistory(tx, [
        {
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          kind: 'DOCUMENT',
          fieldLabel: DOCUMENT_LABELS[docType] ?? docType,
          newValue: file.name,
          ...historyActor(identity),
        },
      ]);
      await refreshCompleteness(tx, store.id);
      return { id };
    });
  },

  // Download passa pelo RLS: documento de outro grupo simplesmente não existe para o ator.
  download(identity: Identity, code: number, documentId: string) {
    return withActor(identity, async (tx) => {
      const { store } = await loadStore(tx, identity, code);
      const doc = await tx.storeDocument.findFirst({
        where: { id: documentId, storeId: store.id },
        select: { fileName: true, mimeType: true, file: { select: { content: true } } },
      });
      if (!doc?.file) throw new NotFoundError('Documento não encontrado', 'DOCUMENT_NOT_FOUND');
      return {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        content: Buffer.from(doc.file.content),
      };
    });
  },
};

export const ensureDocType = (docType: string, allowed: string[]) => {
  if (!allowed.includes(docType)) {
    throw new AppError('Tipo de documento não aceito aqui', 400, 'DOCUMENT_TYPE_INVALID');
  }
};
