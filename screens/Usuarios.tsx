// screens/Usuarios.tsx
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
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, Divider, IconButton, Button, TextInput as PaperInput, ActivityIndicator, Menu } from 'react-native-paper';
import { darkTheme } from '../theme/darkTheme';
import AnimatedDrawer from '../components/AnimatedDrawer';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Tipos baseados na sua entidade User
interface Usuario {
  id: string;
  name: string;
  email: string;
  registration?: string;
  unit?: string;
  role: 'admin' | 'supervisor' | 'user' | 'operator';
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para filtros
interface UserFilters {
  search?: string;
  role?: string;
  unit?: string;
  page?: number;
  limit?: number;
}

// Cargos disponíveis (traduzidos para exibição)
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'user', label: 'Usuário' },
  { value: 'operator', label: 'Operador' },
];

export default function GestaoUsuarios({ navigation }: any) {
  const drawerRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<UserFilters>({});
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [modalEditarUsuario, setModalEditarUsuario] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  
  // Estado para novo usuário
  const [novoUsuario, setNovoUsuario] = useState({
    name: '',
    email: '',
    registration: '',
    unit: '',
    role: 'user' as 'admin' | 'supervisor' | 'user' | 'operator',
    password: '',
    confirmPassword: '',
  });

  // Estado para estatísticas
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    porCargo: {} as Record<string, number>,
  });

  // Carregar usuários
  const carregarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@SIOB:token');
      
      const response = await api.get('/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: filtros,
      });

      const users = response.data.data || [];
      setUsuarios(users);
      setUsuariosFiltrados(users);
      
      // Calcular estatísticas
      const total = users.length;
      const ativos = users.filter((u: Usuario) => u.active !== false).length;
      const inativos = total - ativos;
      
      const porCargo: Record<string, number> = {};
      users.forEach((user: Usuario) => {
        const role = user.role;
        porCargo[role] = (porCargo[role] || 0) + 1;
      });
      
      setEstatisticas({ total, ativos, inativos, porCargo });
      
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtros]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  // Função para filtrar usuários
  useEffect(() => {
    if (busca.trim() === '') {
      setUsuariosFiltrados(usuarios);
    } else {
      const filtrados = usuarios.filter(usuario =>
        usuario.name.toLowerCase().includes(busca.toLowerCase()) ||
        usuario.email.toLowerCase().includes(busca.toLowerCase()) ||
        usuario.registration?.toLowerCase().includes(busca.toLowerCase())
      );
      setUsuariosFiltrados(filtrados);
    }
  }, [busca, usuarios]);

  // Função para criar novo usuário
  const criarUsuario = async () => {
    try {
      if (!novoUsuario.name || !novoUsuario.email) {
        Alert.alert('Atenção', 'Nome e email são obrigatórios');
        return;
      }

      if (novoUsuario.password && novoUsuario.password !== novoUsuario.confirmPassword) {
        Alert.alert('Atenção', 'As senhas não coincidem');
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem('@SIOB:token');
      
      const dadosUsuario = {
        name: novoUsuario.name,
        email: novoUsuario.email,
        registration: novoUsuario.registration || undefined,
        unit: novoUsuario.unit || undefined,
        role: novoUsuario.role,
        password: novoUsuario.password || undefined,
      };

      const response = await api.post('/users', dadosUsuario, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Sucesso', 'Usuário criado com sucesso!');
      setModalNovoUsuario(false);
      setNovoUsuario({
        name: '',
        email: '',
        registration: '',
        unit: '',
        role: 'user',
        password: '',
        confirmPassword: '',
      });
      
      // Recarregar lista
      carregarUsuarios();
      
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Não foi possível criar o usuário'
      );
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar status do usuário
  const atualizarStatus = async (id: string, active: boolean) => {
    try {
      const token = await AsyncStorage.getItem('@SIOB:token');
      
      await api.patch(`/users/${id}/status`, { active }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Sucesso', `Usuário ${active ? 'ativado' : 'desativado'} com sucesso!`);
      carregarUsuarios();
      
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status');
    }
  };

  // Função para deletar usuário
  const deletarUsuario = (id: string, nome: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o usuário ${nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@SIOB:token');
              
              await api.delete(`/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              Alert.alert('Sucesso', 'Usuário excluído com sucesso!');
              carregarUsuarios();
              
            } catch (error: any) {
              console.error('Erro ao excluir usuário:', error);
              Alert.alert(
                'Erro',
                error.response?.data?.message || 'Não foi possível excluir o usuário'
              );
            }
          },
        },
      ]
    );
  };

  // Função para abrir modal de edição
  const abrirEditarUsuario = (usuario: Usuario) => {
    setUsuarioSelecionado(usuario);
    setModalEditarUsuario(true);
  };

  // Renderizar item da lista
  const renderUsuarioItem = ({ item }: { item: Usuario }) => {
    const roleLabel = ROLES.find(r => r.value === item.role)?.label || item.role;
    const isActive = item.active !== false;
    
    return (
      <View style={[styles.tableRow, { backgroundColor: darkTheme.colors.surface }]}>
        <View style={styles.tableCell}>
          <Text style={[styles.cellText, { color: darkTheme.colors.onSurface }]}>
            {item.name}
          </Text>
        </View>
        
        <View style={styles.tableCell}>
          <Text style={[styles.cellText, { color: darkTheme.colors.onSurface }]}>
            {item.email}
          </Text>
        </View>
        
        <View style={styles.tableCell}>
          <View style={[
            styles.cargoBadge,
            { backgroundColor: getRoleColor(item.role) }
          ]}>
            <Text style={styles.cargoText}>
              {roleLabel}
            </Text>
          </View>
        </View>
        
        <View style={styles.tableCell}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isActive ? '#4CAF50' : '#757575' }
          ]}>
            <Text style={styles.statusText}>
              {isActive ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionsCell}>
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setMenuVisible(item.id)}
                iconColor={darkTheme.colors.onSurface}
              />
            }
          >
            <Menu.Item
              title="Editar"
              leadingIcon="pencil"
              onPress={() => {
                setMenuVisible(null);
                abrirEditarUsuario(item);
              }}
            />
            <Menu.Item
              title={isActive ? "Desativar" : "Ativar"}
              leadingIcon={isActive ? "pause-circle" : "play-circle"}
              onPress={() => {
                setMenuVisible(null);
                atualizarStatus(item.id, !isActive);
              }}
            />
            <Menu.Item
              title="Excluir"
              leadingIcon="delete"
              onPress={() => {
                setMenuVisible(null);
                deletarUsuario(item.id, item.name);
              }}
              titleStyle={{ color: '#EF5350' }}
            />
          </Menu>
        </View>
      </View>
    );
  };

  // Função para obter cor do cargo
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#E53935';
      case 'supervisor': return '#1976D2';
      case 'operator': return '#FF9800';
      default: return '#388E3C';
    }
  };

  // Função de refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarUsuarios();
  }, [carregarUsuarios]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: darkTheme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={{ marginTop: 16, color: darkTheme.colors.onSurface }}>
          Carregando usuários...
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
            Gestão de Usuários
          </Text>
          
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Conteúdo da gestão de usuários */}
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
          {/* Barra de busca e ações */}
          <Card style={[styles.cardSection, { backgroundColor: darkTheme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.searchContainer}>
                <TextInput
                  placeholder="Buscar por nome, email ou matrícula"
                  value={busca}
                  onChangeText={setBusca}
                  style={[styles.searchInput, { 
                    backgroundColor: darkTheme.colors.background,
                    color: darkTheme.colors.onSurface,
                    borderColor: darkTheme.colors.outline
                  }]}
                  placeholderTextColor={darkTheme.colors.onSurfaceVariant}
                />
                <View style={styles.buttonsContainer}>
                  <Button
                    mode="outlined"
                    icon="filter"
                    onPress={() => setModalFiltros(true)}
                    style={[styles.filterButton, { borderColor: darkTheme.colors.outline }]}
                    labelStyle={{ color: darkTheme.colors.onSurface }}
                  >
                    Filtros
                  </Button>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => setModalNovoUsuario(true)}
                    style={[styles.addButton, { backgroundColor: darkTheme.colors.primary }]}
                  >
                    Novo
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Tabela de Usuários */}
          <Card style={[styles.cardSection, { backgroundColor: darkTheme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.tableHeader}>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Nome
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Email
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Cargo
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Status
                  </Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={[styles.headerText, { color: darkTheme.colors.primary }]}>
                    Ações
                  </Text>
                </View>
              </View>

              <Divider style={[styles.tableDivider, { backgroundColor: darkTheme.colors.outline }]} />

              {usuariosFiltrados.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconButton
                    icon="account-search"
                    size={40}
                    iconColor={darkTheme.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.emptyText, { color: darkTheme.colors.onSurfaceVariant }]}>
                    {usuarios.length === 0 
                      ? 'Nenhum usuário cadastrado' 
                      : 'Nenhum usuário encontrado com os filtros atuais'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={usuariosFiltrados}
                  renderItem={renderUsuarioItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}

              {/* Informações do resultado */}
              <View style={styles.resultInfo}>
                <Text style={[styles.resultText, { color: darkTheme.colors.onSurfaceVariant }]}>
                  {usuariosFiltrados.length} de {usuarios.length} usuário(s)
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Estatísticas */}
          <Card style={[styles.cardSection, { backgroundColor: darkTheme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: darkTheme.colors.primary }]}>
                Estatísticas
              </Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: darkTheme.colors.primary }]}>
                    {estatisticas.total}
                  </Text>
                  <Text style={[styles.statLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Total
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                    {estatisticas.ativos}
                  </Text>
                  <Text style={[styles.statLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Ativos
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#757575' }]}>
                    {estatisticas.inativos}
                  </Text>
                  <Text style={[styles.statLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Inativos
                  </Text>
                </View>
              </View>

              {/* Distribuição por cargo */}
              <View style={styles.rolesContainer}>
                {Object.entries(estatisticas.porCargo).map(([role, count]) => (
                  <View key={role} style={styles.roleItem}>
                    <View style={styles.roleInfo}>
                      <View style={[styles.roleColor, { backgroundColor: getRoleColor(role) }]} />
                      <Text style={[styles.roleLabel, { color: darkTheme.colors.onSurface }]}>
                        {ROLES.find(r => r.value === role)?.label || role}
                      </Text>
                    </View>
                    <Text style={[styles.roleCount, { color: darkTheme.colors.onSurface }]}>
                      {count}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          <View style={styles.spacing} />
        </ScrollView>
      </View>

      {/* Modal para Novo Usuário */}
      <Modal
        visible={modalNovoUsuario}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !loading && setModalNovoUsuario(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>
                Novo Usuário
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => !loading && setModalNovoUsuario(false)}
                iconColor={darkTheme.colors.onSurface}
                disabled={loading}
              />
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <PaperInput
                label="Nome completo *"
                value={novoUsuario.name}
                onChangeText={(text) => setNovoUsuario({...novoUsuario, name: text})}
                style={styles.modalInput}
                theme={darkTheme}
                mode="outlined"
                disabled={loading}
              />
              
              <PaperInput
                label="Email *"
                value={novoUsuario.email}
                onChangeText={(text) => setNovoUsuario({...novoUsuario, email: text})}
                style={styles.modalInput}
                theme={darkTheme}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={loading}
              />
              
              <PaperInput
                label="Matrícula (opcional)"
                value={novoUsuario.registration}
                onChangeText={(text) => setNovoUsuario({...novoUsuario, registration: text})}
                style={styles.modalInput}
                theme={darkTheme}
                mode="outlined"
                disabled={loading}
              />
              
              <PaperInput
                label="Unidade (opcional)"
                value={novoUsuario.unit}
                onChangeText={(text) => setNovoUsuario({...novoUsuario, unit: text})}
                style={styles.modalInput}
                theme={darkTheme}
                mode="outlined"
                disabled={loading}
              />
              
              <View style={styles.modalSelectContainer}>
                <Text style={[styles.modalLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                  Cargo *
                </Text>
                <View style={styles.rolesOptionsContainer}>
                  {ROLES.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        novoUsuario.role === role.value && { 
                          backgroundColor: getRoleColor(role.value),
                          borderColor: getRoleColor(role.value)
                        }
                      ]}
                      onPress={() => setNovoUsuario({...novoUsuario, role: role.value as any})}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        novoUsuario.role === role.value && { color: '#FFFFFF' }
                      ]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <PaperInput
                label="Senha (opcional - padrão: 123456)"
                value={novoUsuario.password}
                onChangeText={(text) => setNovoUsuario({...novoUsuario, password: text})}
                style={styles.modalInput}
                theme={darkTheme}
                mode="outlined"
                secureTextEntry
                disabled={loading}
              />
              
              <PaperInput
                label="Confirmar Senha"
                value={novoUsuario.confirmPassword}
                onChangeText={(text) => setNovoUsuario({...novoUsuario, confirmPassword: text})}
                style={styles.modalInput}
                theme={darkTheme}
                mode="outlined"
                secureTextEntry
                disabled={loading}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setModalNovoUsuario(false)}
                style={[styles.modalButton, { borderColor: darkTheme.colors.outline }]}
                labelStyle={{ color: darkTheme.colors.onSurface }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={criarUsuario}
                style={[styles.modalButton, { backgroundColor: darkTheme.colors.primary }]}
                loading={loading}
                disabled={loading}
              >
                Criar Usuário
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Detalhes do Usuário */}
      <Modal
        visible={modalEditarUsuario}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalEditarUsuario(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>
                Detalhes do Usuário
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setModalEditarUsuario(false)}
                iconColor={darkTheme.colors.onSurface}
              />
            </View>
            
            {usuarioSelecionado && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    ID:
                  </Text>
                  <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                    {usuarioSelecionado.id}
                  </Text>
                </View>
                
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Nome:
                  </Text>
                  <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                    {usuarioSelecionado.name}
                  </Text>
                </View>
                
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Email:
                  </Text>
                  <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                    {usuarioSelecionado.email}
                  </Text>
                </View>
                
                {usuarioSelecionado.registration && (
                  <View style={styles.userInfoItem}>
                    <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                      Matrícula:
                    </Text>
                    <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                      {usuarioSelecionado.registration}
                    </Text>
                  </View>
                )}
                
                {usuarioSelecionado.unit && (
                  <View style={styles.userInfoItem}>
                    <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                      Unidade:
                    </Text>
                    <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                      {usuarioSelecionado.unit}
                    </Text>
                  </View>
                )}
                
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Cargo:
                  </Text>
                  <View style={[styles.cargoBadgeInline, { backgroundColor: getRoleColor(usuarioSelecionado.role) }]}>
                    <Text style={styles.cargoText}>
                      {ROLES.find(r => r.value === usuarioSelecionado.role)?.label || usuarioSelecionado.role}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Status:
                  </Text>
                  <View style={[
                    styles.statusBadgeInline,
                    { backgroundColor: usuarioSelecionado.active !== false ? '#4CAF50' : '#757575' }
                  ]}>
                    <Text style={styles.statusText}>
                      {usuarioSelecionado.active !== false ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Criado em:
                  </Text>
                  <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                    {new Date(usuarioSelecionado.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                
                <View style={styles.userInfoItem}>
                  <Text style={[styles.userInfoLabel, { color: darkTheme.colors.onSurfaceVariant }]}>
                    Atualizado em:
                  </Text>
                  <Text style={[styles.userInfoValue, { color: darkTheme.colors.onSurface }]}>
                    {new Date(usuarioSelecionado.updatedAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalFooter}>
              <Button
                mode="contained"
                onPress={() => setModalEditarUsuario(false)}
                style={[styles.modalButton, { backgroundColor: darkTheme.colors.primary }]}
              >
                Fechar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Filtros */}
      <Modal
        visible={modalFiltros}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFiltros(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkTheme.colors.onSurface }]}>
                Filtros
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setModalFiltros(false)}
                iconColor={darkTheme.colors.onSurface}
              />
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: darkTheme.colors.onSurfaceVariant, marginBottom: 16 }]}>
                Filtrar por cargo:
              </Text>
              <View style={styles.rolesOptionsContainer}>
                {[{ value: '', label: 'Todos' }, ...ROLES].map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      filtros.role === role.value && { 
                        backgroundColor: role.value ? getRoleColor(role.value) : darkTheme.colors.primary,
                        borderColor: role.value ? getRoleColor(role.value) : darkTheme.colors.primary
                      }
                    ]}
                    onPress={() => {
                      setFiltros(prev => ({
                        ...prev,
                        role: role.value || undefined
                      }));
                    }}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      filtros.role === role.value && { color: '#FFFFFF' }
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => {
                  setFiltros({});
                  setModalFiltros(false);
                }}
                style={[styles.modalButton, { borderColor: darkTheme.colors.outline }]}
                labelStyle={{ color: darkTheme.colors.onSurface }}
              >
                Limpar
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setModalFiltros(false);
                  carregarUsuarios();
                }}
                style={[styles.modalButton, { backgroundColor: darkTheme.colors.primary }]}
              >
                Aplicar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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

  // Barra de busca
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 6,
  },
  addButton: {
    borderRadius: 6,
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
  },
  actionsCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 12,
    textAlign: 'center',
  },
  cargoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  cargoText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  statusText: {
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

  // Estatísticas
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
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

  // Distribuição por cargo
  rolesContainer: {
    marginTop: 10,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  roleLabel: {
    fontSize: 14,
  },
  roleCount: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Espaçamento
  spacing: {
    height: 30,
  },

  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  modalInput: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  modalSelectContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  rolesOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Informações do usuário no modal de detalhes
  userInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  userInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  userInfoValue: {
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  cargoBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  statusBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
});