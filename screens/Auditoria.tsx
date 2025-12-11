import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, Divider, IconButton, Button, ActivityIndicator } from 'react-native-paper';
import { darkTheme } from '../theme/darkTheme';
import AnimatedDrawer from '../components/AnimatedDrawer';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Tipos baseados na sua entidade AuditLog
interface AuditLog {
  id: string;
  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'download';
  entity: 'user' | 'occurrence' | 'report' | 'vehicle';
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// Tipos para filtros
interface AuditFilters {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

// Atualize as constantes de ações e entidades
const ACTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Atualização' },
  { value: 'delete', label: 'Exclusão' },
  { value: 'download', label: 'Download' },
  // Adicione outras ações que seu backend suporta
];

const ENTITIES = [
  { value: 'all', label: 'Todos' },
  { value: 'user', label: 'Usuário' },
  { value: 'occurrence', label: 'Ocorrência' },
  { value: 'report', label: 'Relatório' },
  { value: 'vehicle', label: 'Veículo' },
  // Adicione outras entidades que seu backend suporta
];

export default function AuditoriaLogs({ navigation }: any) {
  const drawerRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsFiltrados, setLogsFiltrados] = useState<AuditLog[]>([]);
  const [filtros, setFiltros] = useState<AuditFilters>({});
  
  // Filtros de UI
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [acaoSelecionada, setAcaoSelecionada] = useState('all');
  const [entidadeSelecionada, setEntidadeSelecionada] = useState('all');

  // screens/Auditoria.tsx - Atualizar a função carregarLogs
const carregarLogs = useCallback(async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('@SIOB:token');
    
    // Construir URL e parâmetros corretamente
    let url = '/audit/logs';
    const params: any = {};
    
    // Adicionar filtros se aplicável
    if (acaoSelecionada !== 'all') {
      params.action = acaoSelecionada;
    }
    
    if (entidadeSelecionada !== 'all') {
      params.entity = entidadeSelecionada;
    }
    
    if (filtroUsuario.trim() !== '') {
      params.search = filtroUsuario;
    }
    
    if (filtroDataInicio) {
      // Converter formato DD/MM/AAAA para ISO se necessário
      params.startDate = filtroDataInicio;
    }
    
    if (filtroDataFim) {
      params.endDate = filtroDataFim;
    }

    console.log('Buscando logs em:', url, 'com params:', params);

    const response = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    console.log('Resposta da API:', response.data);

    // Ajustar conforme a estrutura da sua resposta
    const logsData = response.data.data || response.data || [];
    setLogs(logsData);
    setLogsFiltrados(logsData);
    
  } catch (error: any) {
    console.error('Erro ao carregar logs de auditoria:', error);
    console.log('Status:', error.response?.status);
    console.log('Dados do erro:', error.response?.data);
    console.log('URL:', error.config?.url);
    
    Alert.alert(
      'Erro', 
      error.response?.data?.message || 'Não foi possível carregar os logs de auditoria'
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [acaoSelecionada, entidadeSelecionada, filtroUsuario, filtroDataInicio, filtroDataFim]);

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    carregarLogs();
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltroUsuario('');
    setFiltroEvento('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setAcaoSelecionada('all');
    setEntidadeSelecionada('all');
    // Recarregar com filtros limpos
    setTimeout(() => carregarLogs(), 100);
  };

  // Função para exportar logs
  const exportarLogs = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@SIOB:token');
      
      const response = await api.get('/audit-logs/export', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
      });

      // Aqui você precisaria implementar a lógica para baixar o arquivo
      // Dependendo da implementação do backend
      Alert.alert('Sucesso', 'Logs exportados com sucesso!');
      
    } catch (error: any) {
      console.error('Erro ao exportar logs:', error);
      Alert.alert('Erro', 'Não foi possível exportar os logs');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar item da tabela
  const renderLogItem = ({ item }: { item: AuditLog }) => {
    const getActionColor = (action: string) => {
      switch (action) {
        case 'create': return '#4CAF50';
        case 'update': return '#2196F3';
        case 'delete': return '#F44336';
        case 'login': return '#9C27B0';
        case 'logout': return '#FF9800';
        case 'download': return '#795548';
        default: return '#757575';
      }
    };

    const getActionLabel = (action: string) => {
      const actionMap: Record<string, string> = {
        'create': 'Criação',
        'update': 'Atualização',
        'delete': 'Exclusão',
        'login': 'Login',
        'logout': 'Logout',
        'download': 'Download',
      };
      return actionMap[action] || action;
    };

    const getEntityLabel = (entity: string) => {
      const entityMap: Record<string, string> = {
        'user': 'Usuário',
        'occurrence': 'Ocorrência',
        'report': 'Relatório',
        'vehicle': 'Veículo',
      };
      return entityMap[entity] || entity;
    };

    return (
      <View style={[styles.tableRow, { backgroundColor: darkTheme.colors.surface }]}>
        <View style={styles.tableCell}>
          <Text style={[styles.cellText, { color: darkTheme.colors.onSurface }]}>
            {new Date(item.createdAt).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={[styles.cellSubText, { color: darkTheme.colors.onSurfaceVariant }]}>
            {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={styles.tableCell}>
          <Text style={[styles.cellText, { color: darkTheme.colors.onSurface }]}>
            {item.user?.name || 'Sistema'}
          </Text>
          <Text style={[styles.cellSubText, { color: darkTheme.colors.onSurfaceVariant }]}>
            {item.user?.email || '-'}
          </Text>
        </View>
        
        <View style={styles.tableCell}>
          <View style={[
            styles.actionBadge,
            { backgroundColor: getActionColor(item.action) }
          ]}>
            <Text style={styles.actionText}>
              {getActionLabel(item.action)}
            </Text>
          </View>
        </View>
        
        <View style={styles.tableCell}>
          <View style={[
            styles.entityBadge,
            { backgroundColor: '#333' }
          ]}>
            <Text style={styles.entityText}>
              {getEntityLabel(item.entity)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Renderizar filtro de ação
  const renderAcaoFiltro = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.filtroButtonItem,
        acaoSelecionada === item.value && { backgroundColor: darkTheme.colors.primary }
      ]}
      onPress={() => {
        setAcaoSelecionada(item.value);
      }}
    >
      <Text style={[
        styles.filtroButtonText,
        acaoSelecionada === item.value 
          ? { color: '#FFFFFF' } 
          : { color: darkTheme.colors.onSurface }
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  // Renderizar filtro de entidade
  const renderEntidadeFiltro = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.filtroButtonItem,
        entidadeSelecionada === item.value && { backgroundColor: darkTheme.colors.primary }
      ]}
      onPress={() => {
        setEntidadeSelecionada(item.value);
      }}
    >
      <Text style={[
        styles.filtroButtonText,
        entidadeSelecionada === item.value 
          ? { color: '#FFFFFF' } 
          : { color: darkTheme.colors.onSurface }
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  // Função de refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarLogs();
  }, [carregarLogs]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: darkTheme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={{ marginTop: 16, color: darkTheme.colors.onSurface }}>
          Carregando logs de auditoria...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: darkTheme.colors.background }}>
      {/* Drawer Animated */}
      <AnimatedDrawer ref={drawerRef} />

      {/* Conteúdo principal */}
      <View style={{ flex: 1 }}>
        {/* Header com botão do menu */}
        <View style={[styles.header, { backgroundColor: darkTheme.colors.surface }]}>
          <TouchableOpacity onPress={() => drawerRef.current?.toggle()} style={styles.menuButton}>
            <View style={styles.hamburgerIcon}>
              <View style={[styles.hamburgerLine, { backgroundColor: darkTheme.colors.onSurface }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: darkTheme.colors.onSurface }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: darkTheme.colors.onSurface }]} />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: darkTheme.colors.onSurface }]}>
            Auditoria & Logs
          </Text>
          
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Conteúdo da auditoria */}
        <ScrollView 
          style={[styles.container, { backgroundColor: darkTheme.colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[darkTheme.colors.primary]}
              tintColor={darkTheme.colors.primary}
            />
          }
        >
          {/* Seção de Filtros */}
          <Card style={[styles.cardSection, { backgroundColor: darkTheme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: darkTheme.colors.primary }]}>
                Filtros de Busca
              </Text>

              {/* Filtros por ação */}
              <Text style={[styles.subTitle, { color: darkTheme.colors.onSurface }]}>
                Tipo de Ação
              </Text>
              <FlatList
                data={ACTIONS}
                renderItem={renderAcaoFiltro}
                keyExtractor={(item) => item.value}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtroList}
              />

              {/* Filtros por entidade */}
              <Text style={[styles.subTitle, { color: darkTheme.colors.onSurface }]}>
                Entidade
              </Text>
              <FlatList
                data={ENTITIES}
                renderItem={renderEntidadeFiltro}
                keyExtractor={(item) => item.value}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtroList}
              />

              {/* Filtro de usuário */}
              <Text style={[styles.subTitle, { color: darkTheme.colors.onSurface }]}>
                Usuário
              </Text>
              <TextInput
                placeholder="Digitar nome ou email do usuário"
                value={filtroUsuario}
                onChangeText={setFiltroUsuario}
                style={[styles.input, { 
                  backgroundColor: darkTheme.colors.background,
                  color: darkTheme.colors.onSurface,
                  borderColor: darkTheme.colors.outline
                }]}
                placeholderTextColor={darkTheme.colors.onSurfaceVariant}
              />

              {/* Filtros de data */}
              <View style={styles.dateFilterContainer}>
                <View style={styles.dateInputContainer}>
                  <Text style={[styles.subTitle, { color: darkTheme.colors.onSurface }]}>
                    Data Início
                  </Text>
                  <TextInput
                    placeholder="DD/MM/AAAA"
                    value={filtroDataInicio}
                    onChangeText={setFiltroDataInicio}
                    style={[styles.input, { 
                      backgroundColor: darkTheme.colors.background,
                      color: darkTheme.colors.onSurface,
                      borderColor: darkTheme.colors.outline
                    }]}
                    placeholderTextColor={darkTheme.colors.onSurfaceVariant}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                
                <View style={styles.dateInputContainer}>
                  <Text style={[styles.subTitle, { color: darkTheme.colors.onSurface }]}>
                    Data Fim
                  </Text>
                  <TextInput
                    placeholder="DD/MM/AAAA"
                    value={filtroDataFim}
                    onChangeText={setFiltroDataFim}
                    style={[styles.input, { 
                      backgroundColor: darkTheme.colors.background,
                      color: darkTheme.colors.onSurface,
                      borderColor: darkTheme.colors.outline
                    }]}
                    placeholderTextColor={darkTheme.colors.onSurfaceVariant}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              {/* Botões de ação dos filtros */}
              <View style={styles.filtroButtonsContainer}>
                <Button
                  mode="contained"
                  onPress={aplicarFiltros}
                  style={[styles.filtroButtonApply, { backgroundColor: darkTheme.colors.primary }]}
                  loading={loading}
                  disabled={loading}
                >
                  Aplicar Filtros
                </Button>
                <Button
                  mode="outlined"
                  onPress={limparFiltros}
                  style={[styles.filtroButtonItem, { borderColor: darkTheme.colors.outline }]}
                  labelStyle={{ color: darkTheme.colors.onSurface }}
                  disabled={loading}
                >
                  Limpar
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Tabela de Logs */}
          <Card style={[styles.cardSection, { backgroundColor: darkTheme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.tableHeader}>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Data/Hora
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Usuário
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Ação
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Entidade
                  </Text>
                </View>
              </View>

              <Divider style={[styles.tableDivider, { backgroundColor: darkTheme.colors.outline }]} />

              {logsFiltrados.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconButton
                    icon="clipboard-text-outline"
                    size={40}
                    iconColor={darkTheme.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.emptyText, { color: darkTheme.colors.onSurfaceVariant }]}>
                    {logs.length === 0 
                      ? 'Nenhum log de auditoria encontrado' 
                      : 'Nenhum log encontrado com os filtros aplicados'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={logsFiltrados}
                  renderItem={renderLogItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}

              {/* Informações do resultado */}
              <View style={styles.resultInfo}>
                <Text style={[styles.resultText, { color: darkTheme.colors.onSurfaceVariant }]}>
                  Mostrando {logsFiltrados.length} de {logs.length} registros
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Botões de ação */}
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              icon="download"
              style={[styles.actionButton, { backgroundColor: darkTheme.colors.primary }]}
              onPress={exportarLogs}
              loading={loading}
              disabled={loading}
            >
              Exportar Logs
            </Button>
            <Button
              mode="outlined"
              icon="refresh"
              style={[styles.actionButton, { borderColor: darkTheme.colors.primary }]}
              labelStyle={{ color: darkTheme.colors.primary }}
              onPress={() => carregarLogs()}
              loading={loading}
              disabled={loading}
            >
              Atualizar
            </Button>
          </View>

          <View style={styles.spacing} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header principal
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    padding: 8,
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 40,
  },

  // Estilos do conteúdo
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  cardSection: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 0,
  },
  cardContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },

  // Estilos para filtros
  filtroList: {
    marginBottom: 16,
  },
  filtroButtonItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  filtroButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  filtroButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filtroButtonApply: {
    flex: 1,
    marginHorizontal: 4,
  },

  // Estilos da tabela
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableDivider: {
    height: 1,
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cellText: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  cellSubText: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  actionText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  entityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
  },
  entityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Estados vazios
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  // Informações do resultado
  resultInfo: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 12,
  },

  // Botões de ação
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },

  // Espaçamento
  spacing: {
    height: 30,
  },
});