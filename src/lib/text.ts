/** Lowercases and strips Vietnamese diacritics for accent-insensitive
 *  matching (e.g. "lua dem" matches "Lụa Đêm"). Unicode NFD decomposes
 *  most accented Latin letters into base + combining marks, but "đ" is
 *  its own base letter and needs an explicit swap after lowercasing. */
export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
