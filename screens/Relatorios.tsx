import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Dimensions, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  ActivityIndicator,
} from 'react-native-paper';
import Svg, { Circle, G, Path, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { darkTheme } from '../theme/darkTheme';
import { Ionicons } from '@expo/vector-icons';
import AnimatedDrawer from '../components/AnimatedDrawer';
import { statsService, DashboardStats } from '../services/statsService';

const { width } = Dimensions.get('window');

const OCCURRENCE_TYPES = [
  { key: 'acidente', label: 'Acidentes', color: '#29B6F6' },
  { key: 'resgate', label: 'Resgate', color: '#FFB74D' },
  { key: 'incendio', label: 'Incêndios', color: '#EF5350' },
  { key: 'atropelamento', label: 'Atropelamento', color: '#9C27B0' },
  { key: 'outros', label: 'Outros', color: '#4CAF50' },
];

const OCCURRENCE_STATUS = [
  { value: 'aberto', label: 'Abertas', color: '#EF5350' },
  { value: 'em_andamento', label: 'Em Andamento', color: '#FFB74D' },
  { value: 'finalizado', label: 'Finalizados', color: '#4CAF50' },
  { value: 'alerta', label: 'Alerta', color: '#9C27B0' },
];

const PERIODS = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
];

const DEFAULT_STATS: DashboardStats = {
  occurrences: {
    total: 0,
    byStatus: {
      aberto: 0,
      em_andamento: 0,
      finalizado: 0,
      alerta: 0
    },
    byType: {
      acidente: 0,
      resgate: 0,
      incendio: 0,
      atropelamento: 0,
      outros: 0
    },
    byMunicipality: [],
    monthly: []
  }
};

export default function Relatorios({ navigation }: any) {
  const drawerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [periodData, setPeriodData] = useState<number[]>([]);
  const [hasError, setHasError] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setHasError(false);
      
      const data = await statsService.getDashboardStats();
      
      if (data) {
        setStats(data);
        const periodData = await statsService.getOccurrencesByPeriod(selectedPeriod as any);
        const formattedData = formatPeriodData(periodData, data.occurrences?.total || 0);
        setPeriodData(formattedData);
      } else {
        setStats(DEFAULT_STATS);
        setPeriodData(getDefaultPeriodData(selectedPeriod));
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      setHasError(true);
      Alert.alert('Atenção', 'Não foi possível carregar as estatísticas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatPeriodData = (data: any[], total: number): number[] => {
    if (!data || data.length === 0) {
      return Array(selectedPeriod === 'week' ? 7 : 
                   selectedPeriod === 'month' ? 30 : 12).fill(0);
    }
    
    return data.map(item => item.count || 0);
  };

  const getDefaultPeriodData = (period: string): number[] => {
    return Array(period === 'week' ? 7 : 
                 period === 'month' ? 30 : 12).fill(0);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  const getDonutData = () => {
    const typeData = stats.occurrences.byType;
    const hasData = Object.values(typeData).some(value => Number(value) > 0);
    
    if (!hasData) {
      return OCCURRENCE_TYPES.map(type => ({ 
        ...type,
        value: 0 
      }));
    }

    return OCCURRENCE_TYPES.map(type => ({
      ...type,
      value: Number(typeData[type.key]) || 0,
    }));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: darkTheme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={{ marginTop: 16, color: darkTheme.colors.onSurface }}>
            Carregando estatísticas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const donutData = getDonutData();
  const totalOcorrencias = stats.occurrences.total;
  const statusCounts = stats.occurrences.byStatus;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkTheme.colors.background }]}>
      <AnimatedDrawer ref={drawerRef} />

      <View style={[styles.header, { backgroundColor: darkTheme.colors.surface, borderBottomColor: darkTheme.colors.outline }]}>
        <TouchableOpacity onPress={() => drawerRef.current?.toggle?.()} style={styles.iconButton}>
          <Ionicons name="menu" size={30} color={darkTheme.colors.onSurface} />
        </TouchableOpacity>

        <Text variant="titleMedium" style={[styles.title, { color: darkTheme.colors.onSurface }]}>
          Dashboard
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('EnviarRelatorio')}
          icon="file-download"
          style={styles.generateButton}
          contentStyle={{ height: 36 }}
          labelStyle={{ color: '#fff', fontWeight: '600' }}
        >
          Gerar relatório
        </Button>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[darkTheme.colors.primary]}
            tintColor={darkTheme.colors.primary}
          />
        }
      >
        {hasError && (
          <Card style={[styles.errorCard, { backgroundColor: '#FFE5E5', borderColor: '#FF5252' }]}>
            <Card.Content style={styles.errorContent}>
              <Ionicons name="warning" size={24} color="#FF5252" />
              <Text style={[styles.errorText, { color: '#D32F2F' }]}>
                Não foi possível carregar as estatísticas. Puxe para atualizar.
              </Text>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: darkTheme.colors.onSurface }]}>
              Total de Ocorrências:{' '}
              <Text style={{ fontWeight: '700', color: darkTheme.colors.primary }}>
                {totalOcorrencias}
              </Text>
            </Text>

            <View style={styles.statusRow}>
              {OCCURRENCE_STATUS.map((status, index) => (
                <View key={`status-${index}-${status.value}`} style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    {status.label}:
                  </Text>
                  <Text style={[styles.statusValue, { color: status.color, fontWeight: '700' }]}>
                    {statusCounts[status.value] || 0}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <View style={{ height: 32 }} />

        <View style={styles.centerColumn}>
          <DonutChart 
            data={donutData} 
            size={200} 
            strokeWidth={28} 
            hasData={totalOcorrencias > 0}
          />
          <View style={{ height: 12 }} />
          <Text style={[styles.centerLabel, { color: darkTheme.colors.onSurface }]}>
            Distribuição por Tipo
          </Text>

          <View style={{ height: 16 }} />

          <View style={styles.legendRow}>
            {donutData.map((d, index) => (
              <View key={`legend-${index}-${d.key}`} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: d.color }]} />
                <Text style={[styles.legendText, { color: darkTheme.colors.onSurface }]}>
                  {d.label}
                </Text>
                <Text style={[styles.legendCount, { color: darkTheme.colors.onSurfaceVariant }]}>
                  {d.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />

        <Card style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardSectionTitle, { color: darkTheme.colors.onSurface }]}>
                Ocorrências por Período
              </Text>
              
              <View style={styles.periodSelector}>
                {PERIODS.map((period, index) => (
                  <TouchableOpacity
                    key={`period-${index}-${period.value}`}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period.value && { 
                        backgroundColor: darkTheme.colors.primary 
                      }
                    ]}
                    onPress={() => {
                      setSelectedPeriod(period.value);
                      setPeriodData(getDefaultPeriodData(period.value));
                      loadStats();
                    }}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === period.value 
                        ? { color: '#FFFFFF' } 
                        : { color: darkTheme.colors.onSurface }
                    ]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 140, marginTop: 16 }}>
              <SparklineChart 
                data={periodData} 
                colorFrom="#E53935" 
                colorTo="#8E2323"
                period={selectedPeriod}
                hasData={totalOcorrencias > 0}
              />
            </View>

            {totalOcorrencias === 0 && !loading && (
              <View style={styles.noDataContainer}>
                <Text style={[styles.noDataText, { color: darkTheme.colors.onSurfaceVariant }]}>
                  Nenhuma ocorrência registrada no período
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {stats.users && stats.users.total > 0 && (
          <>
            <View style={{ height: 24 }} />
            
            <Card style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
              <Card.Content>
                <Text style={[styles.cardSectionTitle, { color: darkTheme.colors.onSurface }]}>
                  Estatísticas de Usuários
                </Text>
                
                <View style={styles.userStatsContainer}>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: darkTheme.colors.primary }]}>
                      {stats.users.total}
                    </Text>
                    <Text style={[styles.statLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                      Total de Usuários
                    </Text>
                  </View>
                  
                  <View style={styles.rolesContainer}>
                    {Object.entries(stats.users.byRole || {}).map(([role, count], index) => (
                      <View key={`role-${index}-${role}`} style={styles.roleItem}>
                        <Text style={[styles.roleLabel, { color: darkTheme.colors.onSurface }]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}:
                        </Text>
                        <Text style={[styles.roleCount, { color: darkTheme.colors.primary, fontWeight: '700' }]}>
                          {count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DonutChart({ 
  data, 
  size = 160, 
  strokeWidth = 24,
  hasData = true
}: { 
  data: { key: string; label: string; value: number; color: string }[];
  size?: number; 
  strokeWidth?: number;
  hasData?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);

  let cumulative = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${center}, ${center}`}>
        {data.map((slice, index) => {
          const fraction = slice.value / (total || 1);
          const dash = [fraction * circumference, (1 - fraction) * circumference];
          const rotate = cumulative * 360;
          cumulative += fraction;
          
          return (
            <G key={`slice-${index}-${slice.key}`} rotation={rotate} origin={`${center}, ${center}`}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={hasData ? slice.color : '#555'}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={dash}
                fill="transparent"
                opacity={hasData ? 1 : 0.3}
              />
            </G>
          );
        })}
      </G>

      <Circle 
        cx={center} 
        cy={center} 
        r={radius - strokeWidth / 2} 
        fill={darkTheme.colors.surface} 
      />

      <SvgText
        x={center}
        y={center - 8}
        fontSize={20}
        fill={hasData ? darkTheme.colors.primary : darkTheme.colors.onSurfaceVariant}
        fontWeight="700"
        textAnchor="middle"
      >
        {total}
      </SvgText>

      <SvgText
        x={center}
        y={center + 14}
        fontSize={12}
        fill={darkTheme.colors.onSurfaceVariant}
        textAnchor="middle"
      >
        {hasData ? 'Total' : 'Sem dados'}
      </SvgText>
    </Svg>
  );
}

function SparklineChart({ 
  data, 
  colorFrom = '#E53935', 
  colorTo = '#8E2323',
  period = 'week',
  hasData = true
}: { 
  data: number[]; 
  colorFrom?: string; 
  colorTo?: string;
  period?: string;
  hasData?: boolean;
}) {
  const w = width - 64;
  const h = 120;
  const padding = 8;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - padding * 2) + padding;
    const y = h - ((v - min) / (max - min || 1)) * (h - padding * 2) - padding;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${w - padding} ${h - padding} L ${padding} ${h - padding} Z`;

  const peakIndex = data.indexOf(Math.max(...data));
  const peak = points[peakIndex];

  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hasData ? colorFrom : '#555'} stopOpacity={hasData ? 0.45 : 0.2} />
          <Stop offset="1" stopColor={hasData ? colorTo : '#333'} stopOpacity={hasData ? 0.05 : 0.1} />
        </LinearGradient>
      </Defs>

      <Path d={areaPath} fill="url(#grad)" />

      <Path 
        d={linePath} 
        fill="none" 
        stroke={hasData ? colorFrom : '#777'} 
        strokeWidth={2.4} 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity={hasData ? 1 : 0.5}
      />

      {hasData && peak && (
        <>
          <Circle cx={peak.x} cy={peak.y} r={6} fill="#fff" />
          <Circle cx={peak.x} cy={peak.y} r={4} fill={colorFrom} />
        </>
      )}

      {period === 'week' && (
        <>
          <SvgText x={padding} y={h - 4} fontSize="10" fill="#666" textAnchor="start">Seg</SvgText>
          <SvgText x={w - padding} y={h - 4} fontSize="10" fill="#666" textAnchor="end">Dom</SvgText>
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  generateButton: {
    backgroundColor: '#e53935',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  errorCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statusItem: {
    width: '24%',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 14,
    marginTop: 4,
  },
  centerColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  legendRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    marginRight: 4,
  },
  legendCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userStatsContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    minWidth: 100,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  rolesContainer: {
    flex: 1,
    marginLeft: 16,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  roleLabel: {
    fontSize: 14,
  },
  roleCount: {
    fontSize: 14,
  },
  noDataContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
  },
});