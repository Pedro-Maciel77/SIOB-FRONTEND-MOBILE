import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, IconButton, Button, TextInput, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme/darkTheme';
import AnimatedDrawer from '../components/AnimatedDrawer';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { occurrenceService, Occurrence } from '../services/occurrenceService';

const { width } = Dimensions.get('window');

// Tipos de ocorrência baseados na API
const TIPO_OPTIONS = ['acidente', 'resgate', 'incendio', 'atropelamento', 'outros'];
const TIPO_LABELS: Record<string, string> = {
  'acidente': 'Acidente',
  'resgate': 'Resgate',
  'incendio': 'Incêndio',
  'atropelamento': 'Atropelamento',
  'outros': 'Outros'
};

// Status baseados na API
const STATUS_OPTIONS = ['aberto', 'em_andamento', 'finalizado', 'alerta'];
const STATUS_LABELS: Record<string, string> = {
  'aberto': 'Aberto',
  'em_andamento': 'Em Andamento',
  'finalizado': 'Finalizado',
  'alerta': 'Alerta'
};

export default function Ocorrencias({ navigation }: any) {
  const drawerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [filteredOccurrences, setFilteredOccurrences] = useState<Occurrence[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [periodoStart, setPeriodoStart] = useState<Date | null>(null);
  const [periodoEnd, setPeriodoEnd] = useState<Date | null>(null);
  const [periodoTexto, setPeriodoTexto] = useState<string>('Período');

  // Modais
  const [periodoModalVisible, setPeriodoModalVisible] = useState(false);
  const [modalStatusVisible, setModalStatusVisible] = useState(false);
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);

  // Detalhe
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Carregar ocorrências
  const loadOccurrences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Aqui você precisaria implementar uma função no occurrenceService
      // para buscar ocorrências com filtros
      // Por enquanto, vou mostrar como implementar
      
      // Exemplo: Buscar todas as ocorrências
      // const filters = {
      //   municipality: filtroMunicipio || undefined,
      //   status: filtroStatus || undefined,
      //   type: filtroTipo || undefined,
      //   startDate: periodoStart || undefined,
      //   endDate: periodoEnd || undefined,
      //   page: 1,
      //   limit: 50
      // };
      
      // const result = await occurrenceService.getOccurrences(filters);
      // setOccurrences(result.occurrences);
      // setFilteredOccurrences(result.occurrences);

      // Dados de exemplo enquanto não tem a API
      const mockOccurrences: Occurrence[] = [
        {
          id: '1',
          type: 'acidente',
          municipality: 'Olinda',
          address: 'Rua Ribeirão, Ouro Preto',
          occurrenceDate: '2025-12-10T21:53:56.909Z',
          activationDate: '2025-12-10T21:53:56.909Z',
          status: 'finalizado',
          description: 'Acidente de trânsito',
          createdBy: {
            id: '69be69a7-df2e-4b3f-a0ea-a5bea768ba09',
            name: 'Pedro Henrique',
            email: 'pedro@siob.com'
          },
          images: [],
          createdAt: '2025-12-10T21:53:56.909Z',
          updatedAt: '2025-12-10T21:53:56.909Z'
        },
        {
          id: '2',
          type: 'incendio',
          municipality: 'Recife',
          address: 'Avenida Boa Viagem, 123',
          occurrenceDate: '2025-12-11T14:30:00.000Z',
          activationDate: '2025-12-11T14:35:00.000Z',
          status: 'em_andamento',
          description: 'Incêndio em prédio comercial',
          createdBy: {
            id: '69be69a7-df2e-4b3f-a0ea-a5bea768ba09',
            name: 'Pedro Henrique',
            email: 'pedro@siob.com'
          },
          images: [],
          createdAt: '2025-12-11T14:30:00.000Z',
          updatedAt: '2025-12-11T14:30:00.000Z'
        }
      ];

      setOccurrences(mockOccurrences);
      setFilteredOccurrences(mockOccurrences);
      
    } catch (error: any) {
      console.error('Erro ao carregar ocorrências:', error);
      setError('Não foi possível carregar as ocorrências');
      Alert.alert('Erro', 'Não foi possível carregar as ocorrências.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtroMunicipio, filtroStatus, filtroTipo, periodoStart, periodoEnd]);

  useEffect(() => {
    loadOccurrences();
  }, [loadOccurrences]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOccurrences();
  }, [loadOccurrences]);

  // Funções para datas
  const formatShort = (dateString: string) => {
    const date = new Date(dateString);
    const dd = `${date.getDate()}`.padStart(2, '0');
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dd = `${date.getDate()}`.padStart(2, '0');
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = `${date.getHours()}`.padStart(2, '0');
    const min = `${date.getMinutes()}`.padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  // Aplicar período
  const applyPeriodo = () => {
    if (periodoStart && periodoEnd) {
      // Garantir que start <= end
      let start = periodoStart;
      let end = periodoEnd;
      if (start.getTime() > end.getTime()) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      setPeriodoStart(start);
      setPeriodoEnd(end);
      
      const formatDate = (d: Date) => {
        const dd = `${d.getDate()}`.padStart(2, '0');
        const mm = `${d.getMonth() + 1}`.padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };
      
      setPeriodoTexto(`${formatDate(start)} - ${formatDate(end)}`);
    } else if (periodoStart && !periodoEnd) {
      setPeriodoTexto(`A partir de ${formatShort(periodoStart.toISOString())}`);
    } else if (!periodoStart && periodoEnd) {
      setPeriodoTexto(`Até ${formatShort(periodoEnd.toISOString())}`);
    } else {
      setPeriodoTexto('Período');
    }
    setPeriodoModalVisible(false);
    loadOccurrences(); // Recarrega com novos filtros
  };

  const clearFilters = () => {
    setFiltroMunicipio('');
    setFiltroStatus(null);
    setFiltroTipo(null);
    setPeriodoStart(null);
    setPeriodoEnd(null);
    setPeriodoTexto('Período');
    loadOccurrences();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return '#FFA726';
      case 'em_andamento':
        return '#29B6F6';
      case 'finalizado':
        return '#66BB6A';
      case 'alerta':
        return '#EF5350';
      default:
        return darkTheme.colors.onSurface;
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: darkTheme.colors.surface, borderBottomColor: darkTheme.colors.outline }]}>
      <TouchableOpacity onPress={() => drawerRef.current?.toggle?.()} style={styles.iconButton}>
        <Ionicons name="menu" size={30} color={darkTheme.colors.onSurface} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: darkTheme.colors.onSurface }]}>Ocorrências</Text>

      <View style={{ width: 40 }} />
    </View>
  );

  const renderTableHeader = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { color: darkTheme.colors.onSurfaceVariant, width: 120 }]}>Tipo</Text>
        <Text style={[styles.tableHeaderText, { color: darkTheme.colors.onSurfaceVariant, width: 160 }]}>Local</Text>
        <Text style={[styles.tableHeaderText, { color: darkTheme.colors.onSurfaceVariant, width: 100 }]}>Data</Text>
        <Text style={[styles.tableHeaderText, { color: darkTheme.colors.onSurfaceVariant, width: 100 }]}>Status</Text>
      </View>
    </ScrollView>
  );

  const renderItem = ({ item }: { item: Occurrence }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.tableRow, { backgroundColor: darkTheme.colors.surface }]}>
        <Text style={[styles.tableCell, { color: darkTheme.colors.onSurface, width: 120 }]}>
          {TIPO_LABELS[item.type] || item.type}
        </Text>
        <Text style={[styles.tableCell, { color: darkTheme.colors.onSurfaceVariant, width: 160 }]}>
          {item.municipality}
          {item.neighborhood ? ` - ${item.neighborhood}` : ''}
        </Text>
        <Text style={[styles.tableCell, { color: darkTheme.colors.onSurfaceVariant, width: 100 }]}>
          {formatShort(item.occurrenceDate)}
        </Text>
        <View style={{ width: 100, alignItems: 'flex-start' }}>
          <Chip
            compact
            style={[
              styles.statusChip,
              {
                backgroundColor: getStatusColor(item.status) + '22',
                borderColor: getStatusColor(item.status),
              },
            ]}
            textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
            onPress={() => {
              setFiltroStatus(item.status);
              loadOccurrences();
            }}
          >
            {STATUS_LABELS[item.status] || item.status}
          </Chip>
        </View>
        <TouchableOpacity
          style={{ paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            setSelectedOccurrence(item);
            setDetailModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={22} color={darkTheme.colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: darkTheme.colors.background }}>
        <AnimatedDrawer ref={drawerRef} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={{ marginTop: 16, color: darkTheme.colors.onSurface }}>
            Carregando ocorrências...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: darkTheme.colors.background }}>
      <AnimatedDrawer ref={drawerRef} />

      {renderHeader()}

      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[darkTheme.colors.primary]}
            tintColor={darkTheme.colors.primary}
          />
        }
      >
        {error && (
          <Card style={[styles.errorCard, { backgroundColor: '#FFE5E5', borderColor: '#FF5252' }]}>
            <Card.Content style={styles.errorContent}>
              <Ionicons name="warning" size={24} color="#FF5252" />
              <Text style={[styles.errorText, { color: '#D32F2F' }]}>
                {error}
              </Text>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Card.Content>
            <Text style={[styles.legendTitle, { color: darkTheme.colors.onSurface }]}>
              Toque na ocorrência para ver mais detalhes
            </Text>

            <Divider style={{ marginVertical: 12, backgroundColor: darkTheme.colors.outline }} />

            {filteredOccurrences.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={darkTheme.colors.onSurfaceVariant} />
                <Text style={[styles.emptyStateText, { color: darkTheme.colors.onSurfaceVariant }]}>
                  Nenhuma ocorrência encontrada
                </Text>
              </View>
            ) : (
              <>
                {renderTableHeader()}
                <FlatList
                  data={filteredOccurrences}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <Divider style={{ backgroundColor: darkTheme.colors.outline, marginVertical: 6 }} />}
                  style={{ marginTop: 8, maxHeight: 400 }}
                  scrollEnabled={false}
                />
              </>
            )}
          </Card.Content>
        </Card>

        <View style={{ height: 18 }} />

        <Card style={[styles.filtersCard, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: darkTheme.colors.primary }]}>Filtros</Text>

            <View style={{ height: 8 }} />

            <TextInput
              mode="outlined"
              placeholder="Digite o município"
              value={filtroMunicipio}
              onChangeText={setFiltroMunicipio}
              style={styles.input}
              theme={darkTheme}
              outlineColor={darkTheme.colors.outline}
              activeOutlineColor={darkTheme.colors.primary}
              placeholderTextColor={darkTheme.colors.onSurfaceVariant}
            />

            <View style={styles.filtersRow}>
              <TouchableOpacity style={[styles.smallSelect, { borderColor: darkTheme.colors.outline }]} onPress={() => setModalStatusVisible(true)}>
                <Text style={{ color: filtroStatus ? darkTheme.colors.onSurface : darkTheme.colors.onSurfaceVariant }}>
                  {filtroStatus ? STATUS_LABELS[filtroStatus] : 'Status'}
                </Text>
                <IconButton icon="chevron-down" size={20} iconColor={darkTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.smallSelect, { borderColor: darkTheme.colors.outline }]} onPress={() => setModalTipoVisible(true)}>
                <Text style={{ color: filtroTipo ? darkTheme.colors.onSurface : darkTheme.colors.onSurfaceVariant }}>
                  {filtroTipo ? TIPO_LABELS[filtroTipo] : 'Tipo'}
                </Text>
                <IconButton icon="chevron-down" size={20} iconColor={darkTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.periodBox, { borderColor: darkTheme.colors.outline }]} onPress={() => setPeriodoModalVisible(true)}>
                <Ionicons name="calendar-outline" size={20} color={darkTheme.colors.onSurfaceVariant} />
                <Text style={{ color: darkTheme.colors.onSurfaceVariant, marginLeft: 8, fontSize: 12 }}>{periodoTexto}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button mode="outlined" onPress={clearFilters} style={styles.clearButton} labelStyle={{ color: darkTheme.colors.onSurface }}>
                Limpar filtros
              </Button>
              <Button
                mode="contained"
                onPress={loadOccurrences}
                style={styles.applyButton}
                labelStyle={{ color: '#fff' }}
                loading={loading}
                disabled={loading}
              >
                Aplicar
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Modal status */}
      <Modal visible={modalStatusVisible} animationType="slide" transparent onRequestClose={() => setModalStatusVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>Selecione o status</Text>
              <IconButton icon="close" size={20} iconColor={darkTheme.colors.onSurface} onPress={() => setModalStatusVisible(false)} />
            </View>
            <FlatList
              data={STATUS_OPTIONS}
              keyExtractor={(s) => s}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { 
                  setFiltroStatus(item); 
                  setModalStatusVisible(false);
                  loadOccurrences();
                }} style={styles.modalItem}>
                  <Text style={{ color: darkTheme.colors.onSurface }}>{STATUS_LABELS[item]}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal tipo */}
      <Modal visible={modalTipoVisible} animationType="slide" transparent onRequestClose={() => setModalTipoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>Selecione o tipo</Text>
              <IconButton icon="close" size={20} iconColor={darkTheme.colors.onSurface} onPress={() => setModalTipoVisible(false)} />
            </View>
            <FlatList
              data={TIPO_OPTIONS}
              keyExtractor={(s) => s}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { 
                  setFiltroTipo(item); 
                  setModalTipoVisible(false);
                  loadOccurrences();
                }} style={styles.modalItem}>
                  <Text style={{ color: darkTheme.colors.onSurface }}>{TIPO_LABELS[item]}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Periodo modal */}
      <Modal visible={periodoModalVisible} animationType="slide" transparent onRequestClose={() => setPeriodoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>Escolha o período</Text>
              <IconButton icon="close" size={20} iconColor={darkTheme.colors.onSurface} onPress={() => setPeriodoModalVisible(false)} />
            </View>

            <View style={{ paddingHorizontal: 12, paddingBottom: 18 }}>
              <Text style={{ color: darkTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Data inicial</Text>
              <TouchableOpacity
                style={[styles.periodSelectRow, { borderColor: darkTheme.colors.outline }]}
                onPress={() => {
                  setPickerTarget('start');
                  setShowDatePicker(true);
                }}
              >
                <Text style={{ color: periodoStart ? darkTheme.colors.onSurface : darkTheme.colors.onSurfaceVariant }}>
                  {periodoStart ? periodoStart.toLocaleDateString('pt-BR') : 'Selecionar data inicial'}
                </Text>
                <IconButton icon="calendar" size={20} iconColor={darkTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>

              <Text style={{ color: darkTheme.colors.onSurfaceVariant, marginVertical: 8 }}>Data final</Text>
              <TouchableOpacity
                style={[styles.periodSelectRow, { borderColor: darkTheme.colors.outline }]}
                onPress={() => {
                  setPickerTarget('end');
                  setShowDatePicker(true);
                }}
              >
                <Text style={{ color: periodoEnd ? darkTheme.colors.onSurface : darkTheme.colors.onSurfaceVariant }}>
                  {periodoEnd ? periodoEnd.toLocaleDateString('pt-BR') : 'Selecionar data final'}
                </Text>
                <IconButton icon="calendar" size={20} iconColor={darkTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <Button mode="outlined" onPress={() => { 
                  setPeriodoStart(null); 
                  setPeriodoEnd(null); 
                  setPeriodoTexto('Período'); 
                }} labelStyle={{ color: darkTheme.colors.onSurface }}>
                  Limpar
                </Button>
                <Button mode="contained" onPress={applyPeriodo} labelStyle={{ color: '#fff' }}>
                  Aplicar
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={pickerTarget === 'start' ? (periodoStart || new Date()) : (periodoEnd || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          onChange={(event: any, selectedDate?: Date) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (pickerTarget === 'start') {
                setPeriodoStart(selectedDate);
              } else if (pickerTarget === 'end') {
                setPeriodoEnd(selectedDate);
              }
            }
            setPickerTarget(null);
          }}
        />
      )}

      {/* Modal detalhe ocorrência */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>Detalhes da Ocorrência</Text>
              <IconButton icon="close" size={20} iconColor={darkTheme.colors.onSurface} onPress={() => setDetailModalVisible(false)} />
            </View>

            {selectedOccurrence && (
              <ScrollView style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Tipo</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {TIPO_LABELS[selectedOccurrence.type] || selectedOccurrence.type}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Município</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {selectedOccurrence.municipality}
                  </Text>
                </View>

                {selectedOccurrence.neighborhood && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Bairro</Text>
                    <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                      {selectedOccurrence.neighborhood}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Endereço</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {selectedOccurrence.address}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Data da Ocorrência</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {formatDateTime(selectedOccurrence.occurrenceDate)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Data de Ativação</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {formatDateTime(selectedOccurrence.activationDate)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Status</Text>
                  <Chip
                    compact
                    style={[
                      styles.detailChip,
                      {
                        backgroundColor: getStatusColor(selectedOccurrence.status) + '22',
                        borderColor: getStatusColor(selectedOccurrence.status),
                      },
                    ]}
                    textStyle={{ color: getStatusColor(selectedOccurrence.status) }}
                  >
                    {STATUS_LABELS[selectedOccurrence.status] || selectedOccurrence.status}
                  </Chip>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Descrição</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {selectedOccurrence.description}
                  </Text>
                </View>

                {selectedOccurrence.victimName && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Vítima</Text>
                    <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                      {selectedOccurrence.victimName}
                      {selectedOccurrence.victimContact ? ` - ${selectedOccurrence.victimContact}` : ''}
                    </Text>
                  </View>
                )}

                {selectedOccurrence.vehicleNumber && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Viatura</Text>
                    <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                      {selectedOccurrence.vehicleNumber}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Registrado por</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {selectedOccurrence.createdBy?.name || 'Sistema'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Data de criação</Text>
                  <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                    {formatDateTime(selectedOccurrence.createdAt)}
                  </Text>
                </View>

                {selectedOccurrence.images && selectedOccurrence.images.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: darkTheme.colors.onSurfaceVariant }]}>Imagens</Text>
                    <Text style={[styles.detailValue, { color: darkTheme.colors.onSurface }]}>
                      {selectedOccurrence.images.length} imagem(ns)
                    </Text>
                  </View>
                )}

                <Button 
                  mode="contained" 
                  onPress={() => setDetailModalVisible(false)}
                  style={{ marginTop: 20, backgroundColor: darkTheme.colors.primary }}
                >
                  Fechar
                </Button>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  legendTitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
  },
  statusChip: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filtersCard: {
    marginTop: 12,
    borderRadius: 12,
    elevation: 0,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  filtersRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    width: (width - 64) / 3,
    justifyContent: 'space-between',
  },
  periodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    width: (width - 64) / 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 420,
  },
  detailModal: {
    paddingTop: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalItem: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  periodSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailChip: {
    alignSelf: 'flex-start',
    height: 28,
    borderWidth: 1,
  },
  clearButton: {
    borderColor: darkTheme.colors.outline,
  },
  applyButton: {
    backgroundColor: darkTheme.colors.primary,
  },
});