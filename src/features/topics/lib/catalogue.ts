import { PAGE_SIZE } from '@joutio/client/topics'

/** Page en rangées pleines : environ 20 sujets, arrondis au multiple du nombre de colonnes (`sujets.md`). */
export const pageSizeFor = (columns: number) => columns * Math.ceil(PAGE_SIZE / columns)
