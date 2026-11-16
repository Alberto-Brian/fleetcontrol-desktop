// ========================================
// FILE: src/lib/pdf/templates/GeneralReportPDF.tsx
// ========================================
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Svg, Path, Rect } from '@react-pdf/renderer';
import { reportStyles, getHeaderCompany } from '../report-design';
import { Footer, Watermark } from '@/components/PDFComponents';
import { formatDate, formatCurrency, formatDistance, getPDFSettings } from '../pdf-config-react';
import { pdfT } from '../pdf-translations';

// Componentes de Ícones Vetoriais em SVG
const Icons = {
  Truck: ({ color = '#3b82f6' }) => (
    <Svg width="12" height="12" viewBox="0 0 24 24">
      <Path fill={color} d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </Svg>
  ),
  Users: ({ color = '#8b5cf6' }) => (
    <Svg width="12" height="12" viewBox="0 0 24 24">
      <Path fill={color} d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </Svg>
  ),
  Route: ({ color = '#10b981' }) => (
    <Svg width="12" height="12" viewBox="0 0 24 24">
      <Path fill={color} d="M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18c-1.16.41-2 1.51-2 2.82 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.31-.84-2.41-2-2.82z" />
    </Svg>
  ),
  Dollar: ({ color = '#ef4444' }) => (
    <Svg width="12" height="12" viewBox="0 0 24 24">
      <Path fill={color} d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
    </Svg>
  )
};

const styles = StyleSheet.create({
  pageContainer: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica',
  },

  // Top Bar Elegante
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: '#f8fafc',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateBadgeText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },

  // Secções com Título e Linha
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },

  // Cards de KPI Otimizados com Ícone
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  // Layout 2 Colunas para Análise
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  colBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  boxTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 8,
  },

  // Barras de Progresso de Custo
  progressRow: {
    marginBottom: 6,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 7,
    color: '#334155',
  },
  progressVal: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  barTrack: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },

  // Status List da Frota (Pílulas)
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 7.5,
    color: '#334155',
  },
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

  // Caixa de Resumo Executivo
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
  footerText: {
    fontSize: 7,
    color: '#475569',
    lineHeight: 1.4,
  }
});

interface GeneralReportProps { dashboard: any; dateRange: { start: string; end: string }; }

export const GeneralReportPDF: React.FC<GeneralReportProps> = ({ dashboard, dateRange }) => {
  const t = pdfT();
  const s = getPDFSettings();
  const headerCompany = getHeaderCompany();

  const totalCost = dashboard?.totalCost || 1;
  const costs = [
    { label: t.stats.fuel,            val: dashboard?.fuelCost        ?? 0, color: '#06b6d4' },
    { label: t.stats.maintenances,    val: dashboard?.maintenanceCost ?? 0, color: '#f59e0b' },
    { label: t.stats.generalExpenses, val: dashboard?.expensesCost    ?? 0, color: '#3b82f6' },
    { label: t.stats.fines,           val: dashboard?.finesCost       ?? 0, color: '#ef4444' },
  ];

  const totalVehicles = dashboard?.totalVehicles || 1;
  const statuses = [
    { label: 'Disponível', count: dashboard?.availableVehicles   ?? 0, color: '#10b981' },
    { label: 'Em Uso',     count: dashboard?.inUseVehicles       ?? 0, color: '#3b82f6' },
    { label: 'Manutenção', count: dashboard?.maintenanceVehicles ?? 0, color: '#f59e0b' },
    { label: 'Inativo',    count: dashboard?.inactiveVehicles    ?? 0, color: '#94a3b8' },
  ];

  return (
    <Document>
      <Page size={s.paperSize} orientation={s.orientation} style={styles.pageContainer}>
        <Watermark />

        {/* Header Corporativo Limpo */}
        <View style={styles.headerRow}>
          <View style={reportStyles.headerBrand}>
            {headerCompany.logo ? <Image src={headerCompany.logo} style={reportStyles.headerLogo} /> : null}
            <View>
              <Text style={styles.brandTitle}>{t.reports.general}</Text>
              <Text style={styles.brandSubtitle}>Relatório Consolidado de Desempenho Operacional</Text>
              {headerCompany.line ? <Text style={reportStyles.companyLine}>{headerCompany.line}</Text> : null}
            </View>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
            </Text>
          </View>
        </View>

        {dashboard && (
          <>
            {/* Secção Operação */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleText}>Métricas de Operação</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.totalVehicles}</Text>
                  <Icons.Truck color="#3b82f6" />
                </View>
                <Text style={styles.kpiValue}>{dashboard.totalVehicles ?? 0}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.totalDrivers}</Text>
                  <Icons.Users color="#8b5cf6" />
                </View>
                <Text style={styles.kpiValue}>{dashboard.totalDrivers ?? 0}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.totalTrips}</Text>
                  <Icons.Route color="#10b981" />
                </View>
                <Text style={styles.kpiValue}>{dashboard.totalTrips ?? 0}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.distanceTraveled}</Text>
                  <Icons.Route color="#06b6d4" />
                </View>
                <Text style={styles.kpiValue}>{formatDistance(dashboard.totalDistance ?? 0)}</Text>
              </View>
            </View>

            {/* Secção Financeira */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleText}>Resumo Financeiro</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <View style={styles.kpiTop}>
                  <Text style={[styles.kpiLabel, { color: '#991b1b' }]}>{t.stats.totalCost}</Text>
                  <Icons.Dollar color="#dc2626" />
                </View>
                <Text style={[styles.kpiValue, { color: '#991b1b' }]}>{formatCurrency(dashboard.totalCost ?? 0)}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.fuel}</Text>
                  <Icons.Dollar color="#06b6d4" />
                </View>
                <Text style={styles.kpiValue}>{formatCurrency(dashboard.fuelCost ?? 0)}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.maintenances}</Text>
                  <Icons.Dollar color="#f59e0b" />
                </View>
                <Text style={styles.kpiValue}>{formatCurrency(dashboard.maintenanceCost ?? 0)}</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t.stats.generalExpenses}</Text>
                  <Icons.Dollar color="#3b82f6" />
                </View>
                <Text style={styles.kpiValue}>{formatCurrency(dashboard.expensesCost ?? 0)}</Text>
              </View>
            </View>

            {/* Análise Detalhada em 2 Colunas */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleText}>Análise Estrutural</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.twoCol}>
              {/* Coluna 1: Barras de Distribuição de Custos */}
              <View style={styles.colBox}>
                <Text style={styles.boxTitle}>Distribuição Orçamental</Text>
                {costs.map((c, i) => {
                  const pct = Math.min(100, Math.max(0, (c.val / totalCost) * 100));
                  return (
                    <View key={i} style={styles.progressRow}>
                      <View style={styles.progressMeta}>
                        <Text style={styles.progressLabel}>{c.label}</Text>
                        <Text style={styles.progressVal}>{formatCurrency(c.val)} ({pct.toFixed(1)}%)</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <Svg width="100%" height="5">
                          <Rect x="0" y="0" width={`${pct}%`} height="5" fill={c.color} rx="2" ry="2" />
                        </Svg>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Coluna 2: Estado Atual da Frota */}
              <View style={styles.colBox}>
                <Text style={styles.boxTitle}>Disponibilidade da Frota</Text>
                {statuses.map((st, i) => {
                  const pct = ((st.count / totalVehicles) * 100).toFixed(1);
                  return (
                    <View key={i} style={styles.statusRow}>
                      <View style={styles.statusLabelContainer}>
                        <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                        <Text style={styles.statusText}>{st.label}</Text>
                      </View>
                      <Text style={styles.pillCount}>{st.count} vrs. ({pct}%)</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <Footer />
      </Page>
    </Document>
  );
};