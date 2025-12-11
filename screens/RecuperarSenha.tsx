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
import { useNavigation } from '@react-navigation/native';

export default function RecuperarSenha() {
  const navigation = useNavigation(); // <-- USE ISSO!
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnviar = async () => {
    setLoading(true);
    // lógica de recuperação de senha aqui
    setTimeout(() => {
      setLoading(false);
      // você pode mostrar um toast/modal ou voltar
    }, 900);
  };

  const handleVoltar = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: darkTheme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoWrap}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={[styles.card, { backgroundColor: darkTheme.colors.surface, borderColor: darkTheme.colors.outline }]}>
          <Text style={[styles.cardTitle, { color: darkTheme.colors.onSurface }]}>Informe seu{"\n"}e-mail</Text>
          <TextInput
            mode="outlined"
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            theme={darkTheme}
            outlineColor="transparent"
            activeOutlineColor={darkTheme.colors.primary}
            placeholderTextColor={darkTheme.colors.onSurfaceVariant}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleEnviar}
          loading={loading}
          disabled={loading || !email}
          contentStyle={styles.buttonContent}
          style={[styles.button, { backgroundColor: darkTheme.colors.primary }]}
          labelStyle={{ color: '#fff', fontWeight: '700' }}
        >
          Enviar
        </Button>

        <TouchableOpacity style={styles.voltarWrap} onPress={handleVoltar}>
          <View style={[styles.voltarCard, { backgroundColor: darkTheme.colors.surface }]}>
            <Text style={[styles.voltarText, { color: darkTheme.colors.onSurface }]}>Voltar</Text>
          </View>
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
    justifyContent: 'center', // centraliza verticalmente
    paddingHorizontal: 28,
  },
  logoWrap: {
    position: 'absolute',
    top: 60,
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 120,
    height: 54,
  },
  card: {
    width: '86%',
    maxWidth: 340,
    borderRadius: 12,
    padding: 18,
    elevation: 3,
    marginBottom: 36,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 0,
    width: '100%',
  },
  button: {
    marginTop: 12,
    borderRadius: 16,
    alignSelf: 'center',
    width: 104,
  },
  buttonContent: {
    paddingVertical: 7,
  },
  voltarWrap: {
    marginTop: 42,
    alignSelf: 'center',
  },
  voltarCard: {
    borderRadius: 16,
    paddingHorizontal: 30,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#272727',
  },
  voltarText: {
    fontSize: 15,
    fontWeight: '600',
  },
});