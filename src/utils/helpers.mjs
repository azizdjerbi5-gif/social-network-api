// Compare des ObjectId / documents peuplés / chaînes
export const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);
export const includesId = (list = [], id) => list.some((x) => sameId(x, id));
export const uniqueIds = (list = []) => [...new Set(list.map((x) => String(x?._id ?? x)))];

// Pagination : ?page=1&limit=20
export const paginate = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

export const paginated = (data, total, { page, limit }) => ({
  data,
  pagination: { page, limit, total, pages: Math.ceil(total / limit) }
});

// Échappe une chaîne pour une recherche RegExp
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
