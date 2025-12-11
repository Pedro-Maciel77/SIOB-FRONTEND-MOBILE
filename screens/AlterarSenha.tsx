import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export default function AlterarSenhaScreen() {
  const navigation = useNavigation();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [erro, setErro] = useState('');

  const validarESalvar = () => {
    setErro('');
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (senhaAtual === novaSenha) {
      setErro('A nova senha deve ser diferente da atual.');
      return;
    }

    // Aqui você faria a chamada à API para alterar a senha
    // Exemplo fictício:
    // await api.alterarSenha({ senhaAtual, novaSenha });

    Alert.alert('Sucesso', 'Senha alterada com sucesso!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alterar Senha</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Senha atual</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            secureTextEntry={!showSenhaAtual}
            placeholder="Digite sua senha atual"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity onPress={() => setShowSenhaAtual(!showSenhaAtual)}>
            <Icon name={showSenhaAtual ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nova senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry={!showNovaSenha}
            placeholder="Digite a nova senha"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity onPress={() => setShowNovaSenha(!showNovaSenha)}>
            <Icon name={showNovaSenha ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirmar nova senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            secureTextEntry={!showConfirmarSenha}
            placeholder="Confirme a nova senha"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity onPress={() => setShowConfirmarSenha(!showConfirmarSenha)}>
            <Icon name={showConfirmarSenha ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <TouchableOpacity style={styles.btnSalvar} onPress={validarESalvar}>
        <Icon name="lock-reset" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor:'#232222',
    padding:24,
    justifyContent:'center'
  },
  title: {
    color:'#fff',
    fontSize:22,
    fontWeight:'bold',
    marginBottom:24,
    alignSelf:'center'
  },
  inputGroup: {
    marginBottom:18
  },
  label: {
    color:'#bdbdbd',
    fontWeight:'bold',
    marginBottom:6
  },
  inputRow: {
    flexDirection:'row',
    alignItems:'center',
    backgroundColor:'#35343a',
    borderRadius:8,
    paddingHorizontal:12
  },
  input: {
    flex:1,
    color:'#fff',
    fontSize:16,
    paddingVertical:10
  },
  erro: {
    color:'#C3002F',
    fontWeight:'bold',
    marginBottom:12,
    alignSelf:'center'
  },
  btnSalvar:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'#C3002F',
    borderRadius:8,
    paddingVertical:12,
    marginTop:18
  }
});