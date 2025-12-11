import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Avatar, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedDrawer from '../components/AnimatedDrawer';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const STATUS_OPTIONS = [
  { label: 'Disponível', value: 'disponivel', icon: 'check-circle', color: '#4CAF50' },
  { label: 'Em atendimento', value: 'atendimento', icon: 'fire-truck', color: '#FF9800' },
  { label: 'Em deslocamento', value: 'deslocamento', icon: 'car', color: '#2196F3' },
  { label: 'Fora de serviço', value: 'fora', icon: 'close-circle', color: '#C3002F' },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  squad?: string;
  unit?: string;
  status?: string;
  registration?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserStats {
  total: number;
  finalized: number;
  inProgress: number;
  pending: number;
}

export default function PerfilScreen() {
  const drawerRef = useRef<any>(null);
  const navigation = useNavigation<any>();
  
  // Estados
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [status, setStatus] = useState<string>('disponivel');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Carregar dados do perfil
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // 1. Tentar carregar usuário do AsyncStorage primeiro
      try {
        const storedUser = await AsyncStorage.getItem('@SIOB:user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          if (parsedUser.status) {
            setStatus(parsedUser.status);
          }
          
          console.log('✅ Usuário carregado do storage:', parsedUser.name);
        }
      } catch (storageError) {
        console.warn('Não foi possível carregar usuário do storage:', storageError);
      }
      
      // 2. Tentar buscar dados do usuário atual da API
      try {
        // Obter ID do usuário do token ou storage
        const token = await AsyncStorage.getItem('@SIOB:token');
        if (!token) {
          throw new Error('Token não encontrado');
        }
        
        // Decodificar token para obter userId (simplificado)
        // Na prática, você deveria ter um endpoint /me ou /profile
        // ou armazenar o ID do usuário no storage
        
        // Tentar endpoint /users/me se existir
        try {
          const response = await api.get('/users/me');
          const userData = processUserResponse(response.data);
          
          if (userData) {
            setUser(userData);
            // Salvar no storage
            await AsyncStorage.setItem('@SIOB:user', JSON.stringify(userData));
            
            if (userData.status) {
              setStatus(userData.status);
            }
          }
        } catch (meError: any) {
          console.log('Endpoint /users/me não disponível, tentando alternativas...');
          
          // Se não tiver endpoint /me, tentar buscar pelo token decodificado
          // Esta é uma solução temporária - o ideal é ter um endpoint /me
          const userId = await getUserIdFromToken();
          if (userId) {
            const response = await api.get(`/users/${userId}`);
            const userData = processUserResponse(response.data);
            
            if (userData) {
              setUser(userData);
              await AsyncStorage.setItem('@SIOB:user', JSON.stringify(userData));
              
              if (userData.status) {
                setStatus(userData.status);
              }
            }
          }
        }
        
      } catch (apiError: any) {
        console.warn('⚠️ Não foi possível buscar usuário da API:', apiError.message);
        // Continuar com dados do storage se disponíveis
      }
      
      // 3. Carregar estatísticas
      await loadUserStatistics();
      
    } catch (error: any) {
      console.error('❌ Erro geral ao carregar perfil:', error.message);
      
      Alert.alert(
        'Aviso', 
        'Não foi possível carregar todos os dados do perfil.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Função para processar resposta de usuário
  const processUserResponse = (responseData: any): User | null => {
    try {
      if (!responseData) return null;
      
      // Diferentes formatos de resposta possíveis
      let userData: any;
      
      if (responseData.data) {
        userData = responseData.data;
      } else if (responseData.user) {
        userData = responseData.user;
      } else {
        userData = responseData;
      }
      
      // Garantir estrutura mínima
      return {
        id: userData.id || '',
        name: userData.name || 'Usuário',
        email: userData.email || '',
        role: userData.role || 'user',
        squad: userData.squad || userData.registration,
        unit: userData.unit || 'Não informada',
        status: userData.status || 'disponivel',
        registration: userData.registration,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };
    } catch (error) {
      console.error('Erro ao processar resposta de usuário:', error);
      return null;
    }
  };

  // Obter ID do usuário do token (simplificado)
  const getUserIdFromToken = async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem('@SIOB:token');
      if (!token) return null;
      
      // Decodificar token JWT (parte do payload)
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      
      return decodedPayload.userId || decodedPayload.sub || null;
    } catch (error) {
      console.warn('Não foi possível decodificar token:', error);
      return null;
    }
  };

  const loadUserStatistics = async () => {
    try {
      // Tentar buscar estatísticas gerais primeiro
      try {
        const statsResponse = await api.get('/users/statistics');
        const statsData = statsResponse.data?.data || statsResponse.data;
        
        if (statsData) {
          setStats({
            total: statsData.totalOccurrences || 0,
            finalized: statsData.finalized || 0,
            inProgress: statsData.inProgress || 0,
            pending: statsData.pending || 0
          });
          return;
        }
      } catch (statsError) {
        console.log('Endpoint de estatísticas não disponível, calculando localmente...');
      }
      
      // Fallback: calcular estatísticas baseadas nas ocorrências
      if (user?.id) {
        try {
          const occurrencesResponse = await api.get('/occurrences', {
            params: { limit: 1000 } // Buscar todas para calcular
          });
          
          let occurrences = [];
          if (Array.isArray(occurrencesResponse.data)) {
            occurrences = occurrencesResponse.data;
          } else if (occurrencesResponse.data?.occurrences) {
            occurrences = occurrencesResponse.data.occurrences;
          } else if (occurrencesResponse.data?.data?.occurrences) {
            occurrences = occurrencesResponse.data.data.occurrences;
          }
          
          // Filtrar ocorrências do usuário atual (se possível)
          const userOccurrences = occurrences.filter((occ: any) => 
            occ.createdBy?.id === user.id || 
            occ.userId === user.id ||
            occ.createdBy === user.id
          );
          
          // Calcular estatísticas
          const finalized = userOccurrences.filter((o: any) => o.status === 'finalizado').length;
          const inProgress = userOccurrences.filter((o: any) => o.status === 'em_andamento').length;
          const pending = userOccurrences.filter((o: any) => o.status === 'aberto').length;
          
          setStats({
            total: userOccurrences.length,
            finalized,
            inProgress,
            pending
          });
          
        } catch (occurrencesError) {
          console.warn('Não foi possível carregar ocorrências:', occurrencesError);
        }
      }
      
      // Se ainda não conseguiu, usar valores padrão
      if (!stats) {
        setStats({
          total: 0,
          finalized: 0,
          inProgress: 0,
          pending: 0
        });
      }
      
    } catch (error) {
      console.warn('Erro ao carregar estatísticas:', error);
    }
  };

  // Atualizar status operacional
  const updateUserStatus = async (newStatus: string) => {
    try {
      if (!user?.id) {
        Alert.alert('Erro', 'Usuário não identificado');
        return;
      }
      
      setUpdatingStatus(true);
      
      // Tentar atualizar via API
      try {
        // Endpoint para atualizar status
        await api.patch(`/users/${user.id}/status`, { 
          status: newStatus 
        });
      } catch (apiError: any) {
        // Se endpoint não existir, tentar atualizar perfil completo
        if (apiError.response?.status === 404) {
          await api.put(`/users/${user.id}`, { 
            ...user,
            status: newStatus 
          });
        } else {
          throw apiError;
        }
      }
      
      // Atualizar estado local
      setStatus(newStatus);
      const updatedUser = { ...user, status: newStatus };
      setUser(updatedUser);
      
      // Atualizar no AsyncStorage
      await AsyncStorage.setItem('@SIOB:user', JSON.stringify(updatedUser));
      
      Alert.alert('Sucesso', 'Status atualizado com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      
      // Se API falhar, atualizar apenas localmente
      setStatus(newStatus);
      if (user) {
        const updatedUser = { ...user, status: newStatus };
        setUser(updatedUser);
        await AsyncStorage.setItem('@SIOB:user', JSON.stringify(updatedUser));
      }
      
      Alert.alert('Aviso', 'Status atualizado apenas localmente');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Botão de emergência
  const handleEmergencia = () => {
    Alert.alert(
      "Emergência",
      "Deseja acionar o alerta de emergência?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Acionar", style: "destructive", onPress: () => {
            // Tentar chamar API de emergência
            api.post('/emergency/alert', {
              userId: user?.id,
              userName: user?.name,
              timestamp: new Date().toISOString(),
              type: 'emergency_button'
            }).then(() => {
              Alert.alert("Sucesso", "Alerta enviado para a central!");
            }).catch((error) => {
              console.error('Erro ao enviar alerta:', error);
              Alert.alert("Aviso", "Alerta registrado localmente. A equipe será notificada assim que possível.");
            });
          }
        }
      ]
    );
  };

  // Logout
  const handleLogout = async () => {
    Alert.alert(
      "Sair",
      "Tem certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: async () => {
            try {
              // Tentar chamar endpoint de logout
              try {
                await api.post('/auth/logout');
              } catch (logoutError) {
                console.log('Endpoint de logout não disponível, continuando...');
              }
              
              // Limpar dados locais
              await AsyncStorage.removeItem('@SIOB:token');
              await AsyncStorage.removeItem('@SIOB:user');
              await AsyncStorage.removeItem('@SIOB:refreshToken');
              
              // Redirecionar para login
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              
            } catch (error) {
              console.error('Erro no logout:', error);
              // Forçar limpeza e redirecionamento mesmo com erro
              await AsyncStorage.removeItem('@SIOB:token');
              await AsyncStorage.removeItem('@SIOB:user');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          }
        }
      ]
    );
  };

  const handleAlterarSenha = () => {
    navigation.navigate('AlterarSenha');
  };

  const handleAvatarPress = () => {
    Alert.alert('Foto de perfil', 'Funcionalidade em desenvolvimento');
  };

  // Obter iniciais para avatar
  const getInitials = (name: string = 'Usuário') => {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Obter label do status
  const getStatusLabel = () => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.label : 'Desconhecido';
  };

  // Obter label da role
  const getRoleLabel = (role: string = 'user') => {
    const roleLabels: Record<string, string> = {
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'operator': 'Operador',
      'user': 'Usuário'
    };
    return roleLabels[role] || role;
  };

  if (loading && !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Menu */}
      <TouchableOpacity style={styles.menuIcon} onPress={() => drawerRef.current?.open()}>
        <Icon name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Título */}
      <Text style={styles.title}>Perfil</Text>

      {/* Botão de Emergência */}
      <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergencia}>
        <Icon name="alert" size={28} color="#fff" />
        <Text style={styles.emergencyTxt}>Emergência</Text>
      </TouchableOpacity>

      {/* Perfil */}
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
          <Avatar.Text 
            size={60} 
            label={getInitials(user?.name)} 
            style={styles.avatar}
            color="#fff"
          />
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name || 'Usuário'}</Text>
          <Text style={[styles.role, { color: user?.role === 'admin' ? '#FF5722' : '#4CAF50' }]}>
            {getRoleLabel(user?.role)}
          </Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {user?.registration && (
            <Text style={styles.registration}>Matrícula: {user.registration}</Text>
          )}
        </View>
      </View>

      {/* Status Operacional */}
      <TouchableOpacity 
        style={styles.statusBtn} 
        onPress={() => setShowStatusModal(true)}
        disabled={updatingStatus}
      >
        {updatingStatus ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name={STATUS_OPTIONS.find(opt => opt.value === status)?.icon || "account"} size={22} color="#fff" />
            <Text style={styles.statusTxt}>
              Status: {getStatusLabel()}
            </Text>
            <Icon name="chevron-down" size={22} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      {/* Modal de Status */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowStatusModal(false)}>
          <View style={styles.statusModal}>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statusOption,
                  status === opt.value && { backgroundColor: opt.color + '33' }
                ]}
                onPress={() => {
                  updateUserStatus(opt.value);
                  setShowStatusModal(false);
                }}
                disabled={updatingStatus}
              >
                {updatingStatus && status === opt.value ? (
                  <ActivityIndicator size="small" color={opt.color} />
                ) : (
                  <Icon name={opt.icon} size={22} color={opt.color} />
                )}
                <Text style={[styles.statusOptionTxt, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Dados */}
      <View style={styles.dataRow}>
        <View>
          <Text style={styles.dataLabel}>Esquadrão/Matrícula</Text>
          <Text style={styles.dataValue}>{user?.squad || user?.registration || 'Não informado'}</Text>
        </View>
        <View style={{marginLeft: 24}}>
          <Text style={styles.dataLabel}>Unidade</Text>
          <Text style={styles.dataValue}>{user?.unit || 'Não informada'}</Text>
        </View>
      </View>

      {/* Relatórios */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Estatísticas</Text>
          <Text style={styles.reportItem}>
            Finalizados: <Text style={styles.bold}>{stats?.finalized || 0}</Text>
          </Text>
          <Text style={styles.reportItem}>
            Em aberto: <Text style={styles.bold}>{stats?.pending || 0}</Text>
          </Text>
          <Text style={styles.reportItem}>
            Em andamento: <Text style={styles.bold}>{stats?.inProgress || 0}</Text>
          </Text>
          <Text style={styles.reportItem}>
            Total: <Text style={styles.bold}>{stats?.total || 0}</Text>
          </Text>
        </Card.Content>
      </Card>

      {/* Alterar Senha */}
      <TouchableOpacity style={styles.changePwdBtn} onPress={handleAlterarSenha}>
        <Icon name="lock-reset" size={22} color="#fff" />
        <Text style={{color:'#fff', marginLeft:8}}>Alterar Senha</Text>
      </TouchableOpacity>

      {/* Sair */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Icon name="logout" size={28} color="#C3002F" />
        <Text style={styles.logoutTxt}>Sair</Text>
      </TouchableOpacity>

      {/* Drawer */}
      <AnimatedDrawer ref={drawerRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232222',
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  menuIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 4,
    backgroundColor: '#232222',
    zIndex: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 18,
    marginLeft: 0,
  },
  emergencyBtn:{
    flexDirection:'row',
    alignItems:'center',
    alignSelf:'flex-end',
    backgroundColor:'#C3002F',
    borderRadius:8,
    paddingVertical:6,
    paddingHorizontal:16,
    marginBottom:12
  },
  emergencyTxt:{
    color:'#fff',
    fontWeight:'bold',
    fontSize:17,
    marginLeft:8
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#181818',
  },
  avatar: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  role: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  email: {
    color: '#bdbdbd',
    fontSize: 12,
    marginTop: 2,
  },
  registration: {
    color: '#9E9E9E',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  statusBtn:{
    flexDirection:'row',
    alignItems:'center',
    alignSelf:'flex-start',
    backgroundColor:'#35343a',
    borderRadius:8,
    paddingVertical:6,
    paddingHorizontal:16,
    marginBottom:10
  },
  statusTxt:{
    color:'#fff',
    fontWeight:'bold',
    fontSize:15,
    marginLeft:8,
    marginRight:4
  },
  modalOverlay:{
    flex:1,
    backgroundColor:'rgba(0,0,0,0.4)',
    justifyContent:'center',
    alignItems:'center'
  },
  statusModal:{
    backgroundColor:'#232222',
    borderRadius:12,
    paddingVertical:12,
    width:'80%',
    alignItems:'stretch'
  },
  statusOption:{
    flexDirection:'row',
    alignItems:'center',
    paddingVertical:10,
    paddingHorizontal:18
  },
  statusOptionTxt:{
    fontWeight:'bold',
    fontSize:16,
    marginLeft:10
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 18,
    marginLeft: 4,
  },
  dataLabel: {
    color: '#bdbdbd',
    fontWeight: 'bold',
    fontSize: 13,
  },
  dataValue: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#35343a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fff',
    marginVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle:{
    color:'#fff',
    fontWeight:'bold',
    fontSize:16,
    marginBottom:8
  },
  reportItem:{
    color:'#e0e0e0',
    fontSize:14,
    marginBottom:2
  },
  bold:{
    fontWeight:'bold',
    color:'#fff'
  },
  changePwdBtn:{
    flexDirection:'row',
    alignItems:'center',
    alignSelf:'flex-start',
    backgroundColor:'#35343a',
    borderRadius:8,
    paddingVertical:6,
    paddingHorizontal:16,
    marginBottom:10
  },
  logoutBtn:{
    flexDirection:'row',
    alignItems:'center',
    position:'absolute',
    bottom:32,
    left:24,
    borderWidth:1.5,
    borderColor:'#C3002F',
    borderRadius:8,
    paddingVertical:6,
    paddingHorizontal:16,
    backgroundColor:'#232222'
  },
  logoutTxt:{
    color:'#fff',
    fontWeight:'bold',
    fontSize:17,
    marginLeft:8
  }
});