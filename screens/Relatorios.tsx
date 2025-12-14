// /workspaces/SIOB-FRONTEND-MOBILE/screens/Relatorios.tsx
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
import Svg, { Circle, G, Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { darkTheme } from '../theme/darkTheme';
import { Ionicons } from '@expo/vector-icons';
import AnimatedDrawer from '../components/AnimatedDrawer';
import { statsService, DashboardStats } from '../services/statsService';

const { width } = Dimensions.get('window');

// FUNÇÕES DE SANITIZAÇÃO - ADICIONADAS PARA EVITAR NaN
const sanitizeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
};

const safeMax = (arr: number[]): number => {
  const validNumbers = arr.filter(n => !isNaN(n) && isFinite(n));
  return validNumbers.length > 0 ? Math.max(...validNumbers, 1) : 1;
};

const safeMin = (arr: number[]): number => {
  const validNumbers = arr.filter(n => !isNaN(n) && isFinite(n));
  return validNumbers.length > 0 ? Math.min(...validNumbers, 0) : 0;
};

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
  const [hasError, setHasError] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  // Função para testar conexão com a API
  const testAPIConnection = useCallback(async () => {
    try {
      console.log('🔍 Testando conexão com API...');
      const result = await statsService.testConnection();
      console.log('✅ Resultado do teste:', result);
      setConnectionTested(true);
      return result.success;
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error);
      return false;
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setHasError(false);
      
      console.log('🔄 Carregando dados do banco real...');
      
      // Primeiro testa a conexão se ainda não testou
      if (!connectionTested) {
        const connected = await testAPIConnection();
        if (!connected) {
          throw new Error('Não foi possível conectar ao servidor');
        }
      }
      
      // Busca dados REAIS do banco
      const data = await statsService.getDashboardStats();
      
      console.log('✅ Dados recebidos do banco:', {
        total: data.occurrences.total,
        hasData: data.occurrences.total > 0,
        byType: data.occurrences.byType,
        byStatus: data.occurrences.byStatus
      });
      
      setStats(data);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar estatísticas:', {
        message: error.message,
        code: error.code
      });
      
      setHasError(true);
      
      Alert.alert(
        'Erro de Conexão',
        'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
        [
          { 
            text: 'Tentar Novamente', 
            onPress: () => loadStats(),
            style: 'default'
          },
          { 
            text: 'Usar Dados Offline', 
            onPress: () => {
              // Mantém dados vazios para modo offline
              setStats(DEFAULT_STATS);
            },
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [connectionTested, testAPIConnection]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Log para debug quando os dados mudam
  useEffect(() => {
    if (stats.occurrences.total > 0) {
      console.log('📈 Dados atualizados no estado:', {
        total: stats.occurrences.total,
        tipos: stats.occurrences.byType,
        status: stats.occurrences.byStatus
      });
    }
  }, [stats]);

  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh acionado');
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  const getDonutData = () => {
    const typeData = stats.occurrences.byType;
    
    // SANITIZA TODOS OS VALORES
    const safeTypeData = {
      acidente: sanitizeNumber(typeData.acidente),
      resgate: sanitizeNumber(typeData.resgate),
      incendio: sanitizeNumber(typeData.incendio),
      atropelamento: sanitizeNumber(typeData.atropelamento),
      outros: sanitizeNumber(typeData.outros),
    };
    
    const hasData = Object.values(safeTypeData).some(value => value > 0);
    
    if (!hasData) {
      return OCCURRENCE_TYPES.map(type => ({ 
        ...type,
        value: 0 
      }));
    }

    return OCCURRENCE_TYPES.map(type => ({
      ...type,
      value: safeTypeData[type.key] || 0,
    }));
  };

  // Função para debug da API
  const debugAPI = async () => {
    try {
      console.log('🔧 Iniciando debug da API...');
      const debugResult = await statsService.testConnection();
      console.log('🔍 Resultado do debug:', debugResult);
      
      Alert.alert(
        'Debug API',
        `Status: ${debugResult.success ? '✅ Conectado' : '❌ Erro'}\n` +
        `Mensagem: ${debugResult.message || 'Sem mensagem'}\n` +
        `Código: ${debugResult.status || 'N/A'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: darkTheme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={{ marginTop: 16, color: darkTheme.colors.onSurface }}>
            Conectando ao banco de dados...
          </Text>
          <TouchableOpacity 
            onPress={debugAPI}
            style={[styles.debugButton, { marginTop: 20 }]}
          >
            <Text style={{ color: darkTheme.colors.primary, fontSize: 12 }}>
              Verificar conexão
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const donutData = getDonutData();
  const totalOcorrencias = sanitizeNumber(stats.occurrences.total);
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

        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={debugAPI}
            style={styles.debugHeaderButton}
          >
            <Ionicons name="bug-outline" size={20} color={darkTheme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          
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
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[darkTheme.colors.primary]}
            tintColor={darkTheme.colors.primary}
            title="Atualizando dados..."
            titleColor={darkTheme.colors.onSurfaceVariant}
          />
        }
      >
        {hasError && (
          <Card style={[styles.errorCard, { backgroundColor: '#FFE5E5', borderColor: '#FF5252' }]}>
            <Card.Content style={styles.errorContent}>
              <Ionicons name="warning" size={24} color="#FF5252" />
              <Text style={[styles.errorText, { color: '#D32F2F' }]}>
                Não foi possível conectar ao servidor. Puxe para tentar novamente.
              </Text>
              <TouchableOpacity 
                onPress={loadStats}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {/* Cartão de Status */}
        <Card style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: darkTheme.colors.onSurface }]}>
                Total de Ocorrências
              </Text>
              <View style={styles.totalBadge}>
                <Text style={[styles.totalNumber, { color: darkTheme.colors.primary }]}>
                  {totalOcorrencias}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardSubtitle, { color: darkTheme.colors.onSurfaceVariant }]}>
              Distribuição por status
            </Text>

            <View style={styles.statusRow}>
              {OCCURRENCE_STATUS.map((status, index) => {
                const count = sanitizeNumber(statusCounts[status.value]);
                return (
                  <View key={`status-${index}-${status.value}`} style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <View style={styles.statusContent}>
                      <Text style={[styles.statusLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                        {status.label}
                      </Text>
                      <Text style={[styles.statusValue, { color: status.color, fontWeight: '700' }]}>
                        {count}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            {/* Mostrar taxa de resolução se houver dados */}
            {stats.summary && totalOcorrencias > 0 && (
              <View style={styles.resolutionContainer}>
                <Text style={[styles.resolutionText, { color: darkTheme.colors.onSurfaceVariant }]}>
                  Taxa de resolução: <Text style={{ color: darkTheme.colors.primary, fontWeight: '700' }}>
                    {stats.summary.resolutionRate}
                  </Text>
                </Text>
                <Text style={[styles.resolutionText, { color: darkTheme.colors.onSurfaceVariant }]}>
                  Tempo médio: <Text style={{ color: darkTheme.colors.primary, fontWeight: '700' }}>
                    {stats.summary.averageResponseTime}
                  </Text>
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={{ height: 32 }} />

        {/* Gráfico de Donut */}
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
          
          {totalOcorrencias === 0 && !loading && (
            <Text style={[styles.noDataMessage, { color: darkTheme.colors.onSurfaceVariant }]}>
              Nenhuma ocorrência registrada
            </Text>
          )}

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

        {/* Municípios (se houver dados) */}
        {stats.occurrences.byMunicipality.length > 0 && (
          <>
            <View style={{ height: 24 }} />
            
            <Card style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
              <Card.Content>
                <Text style={[styles.cardSectionTitle, { color: darkTheme.colors.onSurface }]}>
                  Top Municípios
                </Text>
                
                <View style={styles.municipalityContainer}>
                  {stats.occurrences.byMunicipality.slice(0, 5).map((municipality, index) => (
                    <View key={`municipality-${index}`} style={styles.municipalityItem}>
                      <View style={styles.municipalityRank}>
                        <Text style={[styles.rankText, { color: darkTheme.colors.onSurfaceVariant }]}>
                          #{index + 1}
                        </Text>
                      </View>
                      <View style={styles.municipalityContent}>
                        <Text style={[styles.municipalityName, { color: darkTheme.colors.onSurface }]}>
                          {municipality.name}
                        </Text>
                        <Text style={[styles.municipalityCount, { color: darkTheme.colors.primary }]}>
                          {municipality.count} ocorrências
                        </Text>
                      </View>
                      <View style={styles.municipalityPercentage}>
                        <Text style={[styles.percentageText, { color: darkTheme.colors.onSurfaceVariant }]}>
                          {totalOcorrencias > 0 
                            ? `${((municipality.count / totalOcorrencias) * 100).toFixed(1)}%` 
                            : '0%'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Estatísticas de Usuários (se houver) */}
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
                      {sanitizeNumber(stats.users.total)}
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
                          {sanitizeNumber(count)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Botão de debug (apenas desenvolvimento) */}
        {__DEV__ && (
          <>
            <View style={{ height: 24 }} />
            <TouchableOpacity 
              onPress={debugAPI}
              style={[styles.debugButton, { alignSelf: 'center' }]}
            >
              <Text style={{ color: darkTheme.colors.onSurfaceVariant, fontSize: 12 }}>
                Debug API Connection
              </Text>
            </TouchableOpacity>
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
  
  // SANITIZA OS VALORES
  const safeData = data.map(item => ({
    ...item,
    value: sanitizeNumber(item.value)
  }));
  
  const total = safeData.reduce((s, d) => s + d.value, 0);

  let cumulative = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${center}, ${center}`}>
        {safeData.map((slice, index) => {
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
                strokeDasharray={dash.map(n => n.toFixed(2)).join(',')}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
  },
  header: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugHeaderButton: {
    padding: 6,
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
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF5252',
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalBadge: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
  },
  resolutionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resolutionText: {
    fontSize: 13,
  },
  centerColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  noDataMessage: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
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
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  municipalityContainer: {
    marginTop: 12,
  },
  municipalityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  municipalityRank: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  municipalityContent: {
    flex: 1,
    marginLeft: 12,
  },
  municipalityName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  municipalityCount: {
    fontSize: 12,
  },
  municipalityPercentage: {
    width: 48,
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
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
});