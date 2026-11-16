// ========================================
// FILE: src/lib/db/queries/company.queries.ts
// ========================================
import { useDb } from '@/lib/db/db_helpers';
import { company_settings } from '@/lib/db/schemas/company_settings';
import { eq, isNull } from 'drizzle-orm';
import { ICompanySettings, IUpdateCompanySettings } from '@/lib/types/company';

// ID fixo — padrão single-row settings
const COMPANY_ID = 'company_main';

// ─────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────

export async function getCompanySettings(): Promise<ICompanySettings | null> {
  const { db } = useDb();
  const result = await db
    .select()
    .from(company_settings)
    .where(isNull(company_settings.deleted_at))
    .limit(1);
  return (result[0] as ICompanySettings) ?? null;
}

export async function isCompanyConfigured(): Promise<boolean> {
  const s = await getCompanySettings();
  return s !== null;
}

// ─────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────

export async function createCompanySettings(
  data: IUpdateCompanySettings & { company_name: string }
): Promise<ICompanySettings> {
  const { db } = useDb();
  const result = await db
    .insert(company_settings)
    .values({
      id:           COMPANY_ID,
      company_name: data.company_name,
      tax_id:       data.tax_id       ?? null,
      phone:        data.phone        ?? null,
      email:        data.email        ?? null,
      address:      data.address      ?? null,
      city:         data.city         ?? null,
      state:        data.state        ?? null,
      postal_code:  data.postal_code  ?? null,
      currency:     data.currency     ?? 'AOA',
      timezone:     data.timezone     ?? 'Africa/Luanda',
      logo:         null,
    })
    .returning();
  return result[0] as ICompanySettings;
}

// ─────────────────────────────────────────────────────
// UPDATE (upsert — cria se não existir)
// ─────────────────────────────────────────────────────

export async function updateCompanySettings(
  data: IUpdateCompanySettings
): Promise<ICompanySettings> {
  const { db } = useDb();
  const existing = await getCompanySettings();

  if (!existing) {
    // 2026-11-16 — bug real ("UNIQUE constraint failed: company_settings.id"):
    // a eliminação só marca a linha (deleted_at), não a remove. Se a linha
    // única já existe apagada, reactiva-a em vez de tentar criar outra com o
    // mesmo id.
    const [deleted] = await db.select({ id: company_settings.id })
      .from(company_settings).where(eq(company_settings.id, COMPANY_ID)).limit(1);
    if (!deleted) {
      return createCompanySettings({
        company_name: data.company_name ?? 'Empresa',
        ...data,
      });
    }
    await db
      .update(company_settings)
      .set({ company_name: 'Empresa', ...data, deleted_at: null, updated_at: new Date().toISOString() })
      .where(eq(company_settings.id, COMPANY_ID));
    return (await getCompanySettings())!;
  }

  await db
    .update(company_settings)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(company_settings.id, existing.id));

  return (await getCompanySettings())!;
}

// ─────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────

export async function updateCompanyLogo(logoPath: string | null): Promise<ICompanySettings | null> {
  const { db } = useDb();
  const existing = await getCompanySettings();
  if (!existing) return null;

  await db
    .update(company_settings)
    .set({ logo: logoPath, updated_at: new Date().toISOString() })
    .where(eq(company_settings.id, existing.id));

  return getCompanySettings();
}

export async function removeCompanyLogo(): Promise<ICompanySettings | null> {
  return updateCompanyLogo(null);
}

// ─────────────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────────────

export async function deleteCompanySettings(): Promise<void> {
  const { db } = useDb();
  const existing = await getCompanySettings();
  if (!existing) return;

  await db
    .update(company_settings)
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(company_settings.id, existing.id));
}