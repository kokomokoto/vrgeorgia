/** საჯარო ბილიკი. urlKey სერვერი აწყობს სათაურიდან და numericId-დან. */
export function propertyHref(p: { _id: string; urlKey?: string }): string {
  return `/property/${p.urlKey || p._id}`;
}
