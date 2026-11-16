// ========================================
// FILE: src/lib/pdf/report-design.tsx
// ========================================
// Design partilhado dos relatórios PDF — extraído do redesenho de
// GeneralReportPDF.tsx (cabeçalho limpo com selo de datas, secções com linha,
// KPIs com ícone, caixas de análise com barras de progresso, nota final).
// Todos os outros templates usam isto para ficarem idênticos ao Geral.
// (GeneralReportPDF.tsx mantém os seus próprios estilos, iguais aos daqui.)
import React from 'react';
import { Text, View, Image, StyleSheet, Svg, Path, Rect, Circle, Polyline } from '@react-pdf/renderer';
import { formatDate, getPDFCompany } from './pdf-config-react';

// ── Ícones vectoriais (Material, 24x24) ─────────────────────────────────────
const ICON_PATHS = {
  truck:   'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  users:   'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  route:   'M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18c-1.16.41-2 1.51-2 2.82 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.31-.84-2.41-2-2.82z',
  dollar:  'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
  fuel:    'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
  wrench:  'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  alert:   'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  check:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  clock:   'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
} as const;

export type ReportIconName = keyof typeof ICON_PATHS;

export const ReportIcon: React.FC<{ name: ReportIconName; color?: string; size?: number }> = ({
  name, color = '#3b82f6', size = 12,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill={color} d={ICON_PATHS[name]} />
  </Svg>
);

// ── Estilos (iguais aos do GeneralReportPDF) ────────────────────────────────
export const reportStyles = StyleSheet.create({
  pageContainer: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 34, height: 34, objectFit: 'contain', marginRight: 10 },
  companyLine: { fontSize: 6.5, color: '#94a3b8', marginTop: 3 },
  brandTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0f172a', letterSpacing: -0.3 },
  brandSubtitle: { fontSize: 8, color: '#64748b', marginTop: 2 },
  dateBadge: {
    backgroundColor: '#f8fafc',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateBadgeText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#334155' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8 },
  sectionTitleText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },

  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kpiLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  kpiValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a' },

  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  colBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fullBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  boxTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 8 },

  progressRow: { marginBottom: 6 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  progressLabel: { fontSize: 7, color: '#334155' },
  progressVal: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  barTrack: { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 7.5, color: '#334155' },
  pillCount: {
    backgroundColor: '#ffffff',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  footerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginTop: 6,
  },
  footerText: { fontSize: 7, color: '#475569', lineHeight: 1.4 },

  // Tabelas — mesma linguagem (cabeçalho cinza-azulado, linhas finas)
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#475569', textTransform: 'uppercase' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  td: { fontSize: 7.5, color: '#334155' },
  tdBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  emptyText: { fontSize: 8, color: '#94a3b8', textAlign: 'center', paddingVertical: 14 },
});

// ── Componentes ─────────────────────────────────────────────────────────────

/**
 * Cabeçalho: logótipo da empresa (só se estiver definido) + título e
 * subtítulo à esquerda, selo com o período à direita.
 *
 * 2026-11-16 — o logótipo tinha desaparecido dos relatórios desde o redesenho
 * (ce09186): os templates passaram a usar este componente, que não o
 * desenhava, e o Header antigo de PDFComponents.tsx deixou de ser usado. Os
 * dados continuavam a ser carregados (setPDFCompany), só não apareciam.
 */
/** Logótipo (só se definido) e linha pequena com o nome e contactos da empresa. */
export function getHeaderCompany(): { logo: string | null; line: string } {
  const c = getPDFCompany();
  const line = [c.name, c.address, c.phone, c.email].filter(Boolean).join('  ·  ');
  return { logo: c.logo ?? null, line };
}

export const ReportHeader: React.FC<{
  title: string;
  subtitle?: string;
  dateRange?: { start: string; end: string };
  badge?: string;
}> = ({ title, subtitle, dateRange, badge }) => {
  const { logo, line } = getHeaderCompany();
  return (
  <View style={reportStyles.headerRow}>
    <View style={reportStyles.headerBrand}>
      {logo ? <Image src={logo} style={reportStyles.headerLogo} /> : null}
      <View>
        <Text style={reportStyles.brandTitle}>{title}</Text>
        {subtitle ? <Text style={reportStyles.brandSubtitle}>{subtitle}</Text> : null}
        {line ? <Text style={reportStyles.companyLine}>{line}</Text> : null}
      </View>
    </View>
    {(badge || dateRange) ? (
      <View style={reportStyles.dateBadge}>
        <Text style={reportStyles.dateBadgeText}>
          {badge ?? `${formatDate(dateRange!.start)} — ${formatDate(dateRange!.end)}`}
        </Text>
      </View>
    ) : null}
  </View>
  );
};

/** Título de secção com linha (maiúsculas pequenas). */
export const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={reportStyles.sectionHeader}>
    <Text style={reportStyles.sectionTitleText}>{children}</Text>
    <View style={reportStyles.sectionLine} />
  </View>
);

export interface ReportKpi {
  label: string;
  value: string | number;
  icon?: ReportIconName;
  color?: string;
}

/** Linha de cartões de KPI com ícone. */
export const KpiGrid: React.FC<{ cards: ReportKpi[] }> = ({ cards }) => (
  <View style={reportStyles.kpiGrid}>
    {cards.map((c, i) => (
      <View key={i} style={reportStyles.kpiCard}>
        <View style={reportStyles.kpiTop}>
          <Text style={reportStyles.kpiLabel}>{c.label}</Text>
          {c.icon ? <ReportIcon name={c.icon} color={c.color} /> : null}
        </View>
        <Text style={reportStyles.kpiValue}>{String(c.value)}</Text>
      </View>
    ))}
  </View>
);

/** Caixa (cinza-clara) com título; usar dentro de <View style={twoCol}> ou sozinha. */
export const AnalysisBox: React.FC<{ title: string; children: React.ReactNode; full?: boolean }> = ({
  title, children, full,
}) => (
  <View style={full ? reportStyles.fullBox : reportStyles.colBox}>
    <Text style={reportStyles.boxTitle}>{title}</Text>
    {children}
  </View>
);

export interface ProgressItem {
  label: string;
  value: number;
  color: string;
  /** Texto à direita (por omissão `value (pct%)`). */
  display?: string;
}

/** Lista de barras de progresso (distribuição). `total` por omissão = soma. */
export const ProgressList: React.FC<{ items: ProgressItem[]; total?: number }> = ({ items, total }) => {
  const sum = total ?? (items.reduce((a, b) => a + b.value, 0) || 1);
  return (
    <>
      {items.map((it, i) => {
        const pct = Math.min(100, Math.max(0, (it.value / sum) * 100));
        return (
          <View key={i} style={reportStyles.progressRow}>
            <View style={reportStyles.progressMeta}>
              <Text style={reportStyles.progressLabel}>{it.label}</Text>
              <Text style={reportStyles.progressVal}>{it.display ?? `${it.value} (${pct.toFixed(1)}%)`}</Text>
            </View>
            <View style={reportStyles.barTrack}>
              <Svg width="100%" height="5">
                <Rect x="0" y="0" width={`${pct}%`} height="5" fill={it.color} rx="2" ry="2" />
              </Svg>
            </View>
          </View>
        );
      })}
    </>
  );
};

export interface StatusPillItem { label: string; count: number; color: string; suffix?: string }

/** Lista de estados com ponto colorido + pílula de contagem. */
export const StatusPills: React.FC<{ items: StatusPillItem[]; total?: number }> = ({ items, total }) => {
  const sum = total ?? (items.reduce((a, b) => a + b.count, 0) || 1);
  return (
    <>
      {items.map((st, i) => (
        <View key={i} style={reportStyles.statusRow}>
          <View style={reportStyles.statusLabelContainer}>
            <View style={[reportStyles.statusDot, { backgroundColor: st.color }]} />
            <Text style={reportStyles.statusText}>{st.label}</Text>
          </View>
          <Text style={reportStyles.pillCount}>
            {st.count}{st.suffix ? ` ${st.suffix}` : ''} ({((st.count / sum) * 100).toFixed(1)}%)
          </Text>
        </View>
      ))}
    </>
  );
};

/** Linhas chave/valor compactas (substitui o SummaryBox antigo). */
export const KeyValueRows: React.FC<{ rows: { label: string; value: string | number; highlight?: boolean }[] }> = ({ rows }) => (
  <>
    {rows.map((r, i) => (
      <View key={i} style={reportStyles.statusRow}>
        <Text style={reportStyles.statusText}>{r.label}</Text>
        <Text style={r.highlight ? [reportStyles.pillCount, { borderColor: '#3b82f6', color: '#1d4ed8' }] : reportStyles.pillCount}>
          {String(r.value)}
        </Text>
      </View>
    ))}
  </>
);

/** Nota final com barra lateral azul. */
export const NoteBox: React.FC<{ label?: string; children?: React.ReactNode }> = ({ label = 'Nota do Sistema: ', children }) => (
  <View style={reportStyles.footerBox}>
    <Text style={reportStyles.footerText}>
      <Text style={{ fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>{label}</Text>
      {children ?? `Relatório gerado automaticamente. Todos os valores reflectem os registos validados até à data da geração (${formatDate(new Date())}).`}
    </Text>
  </View>
);

/** Estado vazio no estilo do relatório. */
export const EmptyNote: React.FC<{ message: string }> = ({ message }) => (
  <View style={reportStyles.fullBox}>
    <Text style={reportStyles.emptyText}>{message}</Text>
  </View>
);

// ── Gráficos (variedade visual: rosca, colunas, linha) ──────────────────────

export interface ChartDatum { label: string; value: number; color?: string; display?: string }

// Ponto num círculo de raio `r` centrado em (cx, cy), no ângulo `angleDeg`
// (0° = topo, sentido horário) — usado para desenhar cada fatia da rosca
// como um arco Path (Circle do @react-pdf/renderer não suporta
// strokeDashoffset no seu tipo/runtime SVG).
function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Rosca com total ao centro e legenda ao lado. */
export const DonutBox: React.FC<{ items: ChartDatum[]; centerLabel?: string; size?: number }> = ({
  items, centerLabel, size = 84,
}) => {
  const total = items.reduce((a, b) => a + b.value, 0);
  const r = 30;
  const cx = 50, cy = 50;
  let startAngle = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={14} />
          {total > 0 && items.filter(it => it.value > 0).map((it, i) => {
            const sweep = (it.value / total) * 360;
            // Fatia única (100%): um arco não fecha um círculo completo —
            // desenha-se à parte como o próprio Circle cheio.
            if (sweep >= 359.99) {
              return <Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={it.color ?? '#3b82f6'} strokeWidth={14} />;
            }
            const endAngle = startAngle + sweep;
            const p0 = pointOnCircle(cx, cy, r, startAngle);
            const p1 = pointOnCircle(cx, cy, r, endAngle);
            const largeArc = sweep > 180 ? 1 : 0;
            const d = `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
            startAngle = endAngle;
            return (
              <Path key={i} d={d} fill="none" stroke={it.color ?? '#3b82f6'} strokeWidth={14} strokeLinecap="butt" />
            );
          })}
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{String(total)}</Text>
          {centerLabel ? <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>{centerLabel}</Text> : null}
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
            <View style={[reportStyles.statusDot, { backgroundColor: it.color ?? '#3b82f6' }]} />
            <Text style={[reportStyles.statusText, { flex: 1 }]}>{it.label}</Text>
            <Text style={reportStyles.progressVal}>
              {it.display ?? `${it.value} (${total ? ((it.value / total) * 100).toFixed(0) : 0}%)`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/** Colunas verticais (série temporal / comparação), valor em cima, rótulo em baixo. */
export const ColumnChart: React.FC<{ items: ChartDatum[]; color?: string; height?: number }> = ({
  items, color = '#3b82f6', height = 70,
}) => {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 22 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 5.5, color: '#475569', marginBottom: 2 }}>{it.display ?? String(it.value)}</Text>
          <View style={{
            width: '55%', height: Math.max(2, (it.value / max) * height),
            backgroundColor: it.color ?? color, borderTopLeftRadius: 2, borderTopRightRadius: 2,
          }} />
          <Text style={{ fontSize: 5.5, color: '#64748b', marginTop: 3 }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
};

/** Linha com área suave (evolução); rótulos por baixo. */
export const AreaChart: React.FC<{ items: ChartDatum[]; color?: string; height?: number }> = ({
  items, color = '#06b6d4', height = 60,
}) => {
  const W = 300;
  const H = 60;
  const max = Math.max(...items.map(i => i.value), 1);
  const step = items.length > 1 ? W / (items.length - 1) : W;
  const pts = items.map((it, i) => [i * step, H - 6 - (it.value / max) * (H - 14)] as const);
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `M0,${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${W},${H} Z`;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Path d={area} fill={color} fillOpacity={0.15} />
        <Polyline points={line} fill="none" stroke={color} strokeWidth="1.6" />
        {pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r="2.2" fill="#ffffff" stroke={color} strokeWidth="1.2" />)}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 3 }}>
        {items.map((it, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 5.5, color: '#475569' }}>{it.display ?? String(it.value)}</Text>
            <Text style={{ fontSize: 5.5, color: '#64748b' }}>{it.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
