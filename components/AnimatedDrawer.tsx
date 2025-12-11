import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Animated, Dimensions, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ← ADICIONE
import { darkTheme } from '../theme/darkTheme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const { width } = Dimensions.get('window');

type DrawerHandle = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  registration?: string;
  unit?: string;
  createdAt?: string;
  updatedAt?: string;
};

const AnimatedDrawer = forwardRef<DrawerHandle>((_props, ref) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState<UserData | null>(null); // ← ESTADO ADICIONADO
  const slideAnim = useRef(new Animated.Value(-width * 0.7)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    open: () => toggle(true),
    close: () => toggle(false),
    toggle: () => toggle(),
  }));

  // Função para carregar usuário do AsyncStorage
  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('@SIOB:user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('✅ Usuário carregado no drawer:', parsedUser.name);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuário:', error);
    }
  };

  // Carrega o usuário quando o drawer é montado
  useEffect(() => {
    if (visible) {
      loadUser();
    }
  }, [visible]);

  const toggle = (force?: boolean) => {
    const willOpen = force === undefined ? !visible : force;
    if (willOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0.5, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width * 0.7, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  };

  // Função para obter iniciais do nome
  const getInitials = (name: string): string => {
    if (!name) return 'CN';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Função para formatar o cargo
  const formatRole = (role?: string): string => {
    if (!role) return 'Administrador';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Função de logout
  const handleLogout = async () => {
    try {
      // Limpa o AsyncStorage
      await AsyncStorage.multiRemove(['@SIOB:token', '@SIOB:user', '@SIOB:token_expires']);
      toggle(false);
      
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 300);
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      toggle(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
            backgroundColor: 'rgba(0,0,0,0.7)',
          },
        ]}
      >
        <TouchableOpacity style={styles.overlayTouchable} onPress={() => toggle(false)} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
            backgroundColor: darkTheme.colors.surface,
            borderRightColor: darkTheme.colors.outline,
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={() => {
                toggle(false);
                navigation.navigate('Perfil');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: darkTheme.colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user ? getInitials(user.name) : 'CN'}
                </Text>
              </View>
            </TouchableOpacity>
            <View>
              <Text style={[styles.userName, { color: darkTheme.colors.onSurface }]}>
                {user?.name || 'Carregando...'}
              </Text>
              <Text style={[styles.userRole, { color: darkTheme.colors.onSurfaceVariant }]}>
                {formatRole(user?.role)}
              </Text>
              {user?.email && (
                <Text style={[styles.userEmail, { color: darkTheme.colors.onSurfaceVariant, fontSize: 12 }]}>
                  {user.email}
                </Text>
              )}
            </View>
          </View>

          <IconButton
            icon="close"
            iconColor={darkTheme.colors.onSurface}
            size={24}
            onPress={() => toggle(false)}
            style={styles.closeButton}
          />
        </View>

        <View style={styles.menuItems}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              toggle(false);
              navigation.navigate('Relatorios');
            }}
          >
            <Text style={[styles.menuItemText, { color: darkTheme.colors.onSurface }]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              toggle(false);
              navigation.navigate('EnviarRelatorio');
            }}
          >
            <Text style={[styles.menuItemText, { color: darkTheme.colors.onSurface }]}>
              Registar Ocorrência
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              toggle(false);
              navigation.navigate('Ocorrencias');
            }}
          >
            <Text style={[styles.menuItemText, { color: darkTheme.colors.onSurface }]}>
              Ocorrências
            </Text>
          </TouchableOpacity>

          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  toggle(false);
                  navigation.navigate('Usuarios');
                }}
              >
                <Text style={[styles.menuItemText, { color: darkTheme.colors.onSurface }]}>
                  Usuários
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  toggle(false);
                  navigation.navigate('Auditoria');
                }}
              >
                <Text style={[styles.menuItemText, { color: darkTheme.colors.onSurface }]}>
                  Auditoria
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.drawerFooter}>
          <Button
            mode="outlined"
            icon="logout"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor={darkTheme.colors.error}
          >
            Sair
          </Button>
        </View>
      </Animated.View>
    </>
  );
});

export default AnimatedDrawer;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.7,
    zIndex: 999,
    borderRightWidth: 1,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { 
    color: '#FFF', 
    fontWeight: '700',
    fontSize: 16,
  },
  userName: { 
    fontSize: 16, 
    fontWeight: '600',
    marginBottom: 2,
  },
  userRole: { 
    fontSize: 13, 
    opacity: 0.8,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 11,
    opacity: 0.6,
  },
  closeButton: { 
    margin: 0,
    marginLeft: 10,
  },
  menuItems: { 
    flex: 1,
    paddingTop: 10,
  },
  menuItem: { 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#333',
  },
  menuItemText: { 
    fontSize: 16, 
    fontWeight: '500' 
  },
  drawerFooter: { 
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  logoutButton: { 
    borderWidth: 1, 
    borderRadius: 6,
    borderColor: darkTheme.colors.error,
  },
});