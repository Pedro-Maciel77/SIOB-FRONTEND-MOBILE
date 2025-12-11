// services/statsService.ts - CORRIGIDO
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OccurrenceStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byMunicipality: Array<{ name: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
}

export interface DashboardStats {
  occurrences: OccurrenceStats;
  users?: {
    total: number;
    byRole: Record<string, number>;
  };
  vehicles?: {
    total: number;
    active: number;
  };
}

export const statsService = {
  // Buscar estatísticas do dashboard
  async getDashboardStats(filters?: any): Promise<DashboardStats | null> {
    try {
      const token = await AsyncStorage.getItem('@SIOB:token');
      if (!token) {
        console.warn('Token não encontrado');
        return null;
      }

      // Tenta buscar estatísticas de ocorrências
      const occurrencesResponse = await api.get('/occurrences/statistics', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      
      // Verifica se a resposta tem dados
      if (!occurrencesResponse.data) {
        console.warn('Resposta sem dados do servidor');
        return null;
      }
      
      // Ajustar conforme a estrutura do seu backend
      const occurrencesData = occurrencesResponse.data.data || occurrencesResponse.data;
      
      // Retorna apenas os dados de ocorrências (usuários são opcionais)
      return {
        occurrences: occurrencesData
      };
      
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message || 'Erro desconhecido',
        url: error.config?.url
      });
      
      // Retorna null para indicar que não conseguiu carregar
      return null;
    }
  },

  // Buscar estatísticas de ocorrências por período
  async getOccurrencesByPeriod(period: 'day' | 'week' | 'month' | 'year'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('@SIOB:token');
      if (!token) {
        console.warn('Token não encontrado');
        return [];
      }

      const response = await api.get('/occurrences/by-period', {
        headers: { Authorization: `Bearer ${token}` },
        params: { period }
      });
      
      return response.data?.data || response.data || [];
    } catch (error: any) {
      console.warn('Endpoint de período não disponível:', error.message || 'Erro desconhecido');
      return [];
    }
  },
};