import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { darkTheme } from '../theme/darkTheme'; // ajuste o path se necessário
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEsqueciSenha = () => {
  navigation.navigate('RecuperarSenha');
};

const handleEntrar = async () => {
  try {
    setLoading(true);

    const response = await api.post('/auth/login', {
      email,
      password: senha,
    });

    // Estrutura correta baseada no log:
    // response.data = { success: true, data: { tokens: { accessToken: "...", expiresIn: 3600 }, user: {...} } }
    
    const { data } = response.data; // data contém { tokens: {...}, user: {...} }
    const { tokens, user } = data; // tokens contém { accessToken: "...", expiresIn: 3600 }
    
    // ✅ O token está em tokens.accessToken
    const token = tokens.accessToken;

    console.log('Token extraído:', token ? 'SIM' : 'NÃO');
    console.log('User:', user);

    if (!token) {
      throw new Error('Token não encontrado na resposta');
    }

    if (!user) {
      throw new Error('Usuário não encontrado na resposta');
    }

    // ✅ Agora salva corretamente
    await AsyncStorage.setItem('@SIOB:token', token);
    await AsyncStorage.setItem('@SIOB:user', JSON.stringify(user));

    // Opcional: salvar também o tempo de expiração se quiser
    await AsyncStorage.setItem('@SIOB:token_expires', tokens.expiresIn.toString());

    navigation.replace('Relatorios');

  } catch (error: any) {
    console.log('Erro no login:', error.message);
    alert(error.response?.data?.message || 'Erro ao fazer login');
  } finally {
    setLoading(false);
  }
};
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: darkTheme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* logo no topo (posicionado absolute para ficar no topo centralizado) */}
        <View style={styles.logoWrap}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        {/* card centralizado */}
        <View style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Text style={[styles.cardTitle, { color: darkTheme.colors.onSurface }]}>Login</Text>

          <TextInput
            mode="outlined"
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input]}
            theme={darkTheme}
            outlineColor="transparent"
            activeOutlineColor={darkTheme.colors.primary}
            placeholderTextColor={darkTheme.colors.onSurfaceVariant}
          />

          <TextInput
            mode="outlined"
            placeholder="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            style={[styles.input]}
            theme={darkTheme}
            outlineColor="transparent"
            activeOutlineColor={darkTheme.colors.primary}
            placeholderTextColor={darkTheme.colors.onSurfaceVariant}
          />

          <Button
            mode="contained"
            onPress={handleEntrar}
            loading={loading}
            disabled={loading || !email || !senha}
            contentStyle={styles.buttonContent}
            style={[styles.button, { backgroundColor: darkTheme.colors.primary }]}
            labelStyle={{ color: '#fff', fontWeight: '700' }}
          >
            Entrar
          </Button>
        </View>

        {/* esqueceu a senha no rodapé */}
        <TouchableOpacity style={styles.forgotWrap} onPress={handleEsqueciSenha}>
          <Text style={[styles.forgotText, { color: darkTheme.colors.onSurfaceVariant }]}>Esqueceu a senha?</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // centraliza o card verticalmente
    paddingHorizontal: 28,
  },
  logoWrap: {
    position: 'absolute',
    top: 64, // ajuste conforme quiser mais/menos distância do topo
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 140,
    height: 80,
  },
  card: {
    width: '86%',
    maxWidth: 360,
    borderRadius: 14,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
    width: '100%',
  },
  button: {
    marginTop: 6,
    borderRadius: 20,
    alignSelf: 'center',
    width: 140,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  forgotWrap: {
    bottom: 28,
    alignSelf: 'center',
  },
  forgotText: {
    fontSize: 13,
    top: 40
  },
});