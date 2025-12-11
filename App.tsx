import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { darkTheme } from './theme/darkTheme';
import Login from './screens/Login';
import Ocorrencias from './screens/Ocorrencias';
import EnviarRelatorio from './screens/EnviarRelatorio';
import RecuperarSenha from './screens/RecuperarSenha'; // <-- Adicione isso
import Relatorios from './screens/Relatorios';
import Usuarios from './screens/Usuarios';
import Auditoria from './screens/Auditoria';
import Perfil from './screens/Perfil';
import AlterarSenha from './screens/AlterarSenha'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider theme={darkTheme}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={Login}/>
          <Stack.Screen name="Auditoria" component={Auditoria}/>
          <Stack.Screen name="Usuarios" component={Usuarios}/>
          <Stack.Screen name="RecuperarSenha" component={RecuperarSenha}/>
          <Stack.Screen name="Ocorrencias" component={Ocorrencias}/>
          <Stack.Screen name="AlterarSenha" component={AlterarSenha}/>
          <Stack.Screen name="EnviarRelatorio" component={EnviarRelatorio}/>
          <Stack.Screen name="Relatorios" component={Relatorios}/>
          <Stack.Screen name="Perfil" component={Perfil}/>
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}