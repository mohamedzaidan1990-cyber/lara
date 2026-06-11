// Shared query tokenizer for catalogue search. Splits a user query into
// lowercase alphanumeric tokens with accents stripped ("Kiehl's Crème" →
// ["kiehl", "s", "creme"]). Each token is then required to appear somewhere
// in the normalized brand+name haystack, so word order, punctuation and
// brand-vs-name placement don't matter.
export function normalizeQueryTokens(q: string): string[] {
  return q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 8);
}

// SQL expression mirroring the same normalization on the database side:
// lowercase, fold common accented characters, then drop everything that
// isn't [a-z0-9 ]. Kept as a string so both search routes share one
// definition — interpolate with sql.unsafe-style template literals is not
// available on the neon http client, so routes inline it via this constant.
export function normalizedHaystackSql(expr: string): string {
  return (
    "regexp_replace(translate(lower(" +
    expr +
    "), 'àáâãäåāèéêëēìíîïīòóôõöøùúûüūçñÿœæ', 'aaaaaaaeeeeeiiiiioooooouuuuucnyoa'), '[^a-z0-9 ]', '', 'g')"
  );
}
