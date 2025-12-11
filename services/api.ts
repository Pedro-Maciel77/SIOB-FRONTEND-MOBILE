import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração base da API
const api = axios.create({
  baseURL: 'https://obscure-tribble-x5vwr579jqpxhp47p-3000.app.github.dev/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Interceptor para adicionar token às requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@SIOB:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Tratamento de erros comuns
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.removeItem('@SIOB:token');
      await AsyncStorage.removeItem('@SIOB:user');
      // Você pode redirecionar para login aqui
    }
    return Promise.reject(error);
  }
);

export default api;