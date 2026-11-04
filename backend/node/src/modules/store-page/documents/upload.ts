import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../../../shared/errors/app-error.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Arquivo em memória (vai para o banco em seguida); limite de 10 MB.
const receiver = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

export const receiveFile = (req: Request, res: Response, next: NextFunction) => {
  receiver.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('O arquivo passa de 10 MB', 413, 'FILE_TOO_LARGE'));
      return;
    }
    next(error);
  });
};

// Tipo conferido pelos primeiros bytes, não pela extensão (um .exe renomeado é recusado).
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

export const detectMime = (content: Buffer): string | null =>
  SIGNATURES.find(({ bytes }) => bytes.every((byte, index) => content[index] === byte))?.mime ??
  null;

export const requireFile = (req: Request) => {
  const file = req.file;
  if (!file || file.size === 0) throw new AppError('Escolha um arquivo', 400, 'FILE_REQUIRED');
  const mime = detectMime(file.buffer);
  if (!mime) throw new AppError('Envie PDF, JPG ou PNG', 415, 'FILE_TYPE_NOT_ALLOWED');
  return { name: file.originalname.slice(0, 200), mime, content: file.buffer, size: file.size };
};
