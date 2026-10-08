export default class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const forbidden = (message = 'Action non autorisée.') => new AppError(403, message);
export const notFound = (what = 'Ressource') => new AppError(404, `${what} introuvable.`);
export const conflict = (message) => new AppError(409, message);
