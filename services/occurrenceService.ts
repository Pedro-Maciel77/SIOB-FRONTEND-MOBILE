import api from './api';

export interface CreateOccurrenceData {
  type: 'acidente' | 'resgate' | 'incendio' | 'atropelamento' | 'outros';
  municipality: string;
  neighborhood?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  occurrenceDate: string; // ISO string
  activationDate: string; // ISO string
  status: 'aberto' | 'em_andamento' | 'finalizado' | 'alerta';
  victimName?: string;
  victimContact?: string;
  vehicleNumber?: string;
  description: string;
  vehicleId?: string;
  createdBy: string; // ← LINHA ADICIONADA (OBRIGATÓRIO)
}

export interface Occurrence {
  id: string;
  type: string;
  municipality: string;
  neighborhood?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  occurrenceDate: string;
  activationDate: string;
  status: string;
  victimName?: string;
  victimContact?: string;
  vehicleNumber?: string;
  description: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  vehicle?: {
    id: string;
    plate: string;
    name: string;
  };
  images: Array<{
    id: string;
    filename: string;
    path: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Interface para filtros
export interface OccurrenceFilters {
  page?: number;
  limit?: number;
  municipality?: string;
  status?: string;
  type?: string;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  createdBy?: string;
  vehicleId?: string;
  neighborhood?: string;
}

// Interface para resposta paginada
export interface OccurrenceListResponse {
  occurrences: Occurrence[];
  total: number;
  page: number;
  totalPages: number;
}

// Interface para resposta da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Interfaces para municípios
export interface Municipality {
  id: number;
  name: string;
  state?: {
    id: number;
    uf: string;
    name: string;
  };
  active?: boolean;
  wasCreated?: boolean;
}

export const occurrenceService = {
  // ==================== FUNÇÕES PARA LISTAGEM ====================
  
  // Buscar ocorrências com filtros
  async getOccurrences(filters?: OccurrenceFilters): Promise<ApiResponse<OccurrenceListResponse>> {
    try {
      console.log('🔍 Buscando ocorrências com filtros:', filters);
      
      const params: any = {};
      
      // Adiciona filtros se existirem
      if (filters) {
        if (filters.page) params.page = filters.page;
        if (filters.limit) params.limit = filters.limit;
        if (filters.municipality && filters.municipality.trim()) {
          params.municipality = filters.municipality.trim();
        }
        if (filters.status) params.status = filters.status;
        if (filters.type) params.type = filters.type;
        if (filters.startDate) {
          // Garantir que é uma data válida
          const startDate = new Date(filters.startDate);
          if (!isNaN(startDate.getTime())) {
            params.startDate = startDate.toISOString();
          }
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          if (!isNaN(endDate.getTime())) {
            // Adicionar fim do dia
            endDate.setHours(23, 59, 59, 999);
            params.endDate = endDate.toISOString();
          }
        }
        if (filters.createdBy) params.createdBy = filters.createdBy;
        if (filters.vehicleId) params.vehicleId = filters.vehicleId;
        if (filters.neighborhood && filters.neighborhood.trim()) {
          params.neighborhood = filters.neighborhood.trim();
        }
      }
      
      console.log('📤 Parâmetros da busca:', params);
      
      const response = await api.get('/occurrences', { params });
      
      // Verificar estrutura da resposta
      let occurrences: Occurrence[] = [];
      let total = 0;
      let page = filters?.page || 1;
      
      if (response.data && Array.isArray(response.data)) {
        // Se a resposta for um array direto
        occurrences = response.data;
        total = response.data.length;
      } else if (response.data?.occurrences) {
        // Se a resposta tiver estrutura { occurrences, total, page, totalPages }
        occurrences = response.data.occurrences;
        total = response.data.total || response.data.occurrences.length;
        page = response.data.page || page;
      } else if (response.data?.data?.occurrences) {
        // Se a resposta tiver estrutura { data: { occurrences, total, page } }
        occurrences = response.data.data.occurrences;
        total = response.data.data.total || response.data.data.occurrences.length;
        page = response.data.data.page || page;
      }
      
      console.log(`✅ ${occurrences.length} ocorrências encontradas (total: ${total})`);
      
      return {
        success: true,
        data: {
          occurrences,
          total,
          page,
          totalPages: Math.ceil(total / (filters?.limit || 10))
        }
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar ocorrências:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Retorna estrutura vazia em caso de erro
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao carregar ocorrências',
        data: {
          occurrences: [],
          total: 0,
          page: filters?.page || 1,
          totalPages: 0
        }
      };
    }
  },

  // Buscar ocorrência por ID
  async getOccurrenceById(id: string): Promise<ApiResponse<Occurrence>> {
    try {
      console.log(`🔍 Buscando ocorrência: ${id}`);
      
      const response = await api.get(`/occurrences/${id}`);
      
      console.log('✅ Ocorrência encontrada');
      
      // Ajustar estrutura da resposta
      let occurrenceData: Occurrence;
      if (response.data?.data) {
        occurrenceData = response.data.data;
      } else if (response.data) {
        occurrenceData = response.data;
      } else {
        throw new Error('Formato de resposta inválido');
      }
      
      return {
        success: true,
        data: occurrenceData
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar ocorrência:', error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao buscar ocorrência'
      };
    }
  },

  // ==================== FUNÇÕES EXISTENTES (com ajustes) ====================
  
  // Criar nova ocorrência
  async createOccurrence(data: CreateOccurrenceData): Promise<ApiResponse<Occurrence>> {
    try {
      console.log('📤 Enviando ocorrência para:', '/occurrences');
      console.log('Dados:', data);

      const response = await api.post('/occurrences', data);

      if (response.data.success === false) {
        throw new Error(response.data.message || 'Erro ao criar ocorrência');
      }

      console.log('✅ Ocorrência criada com sucesso');
      
      return {
        success: true,
        data: response.data.data || response.data
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao criar ocorrência:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao criar ocorrência'
      };
    }
  },

  // Upload de imagem para ocorrência
  async uploadImage(occurrenceId: string, imageUri: string): Promise<ApiResponse<any>> {
    try {
      // Cria FormData para upload
      const formData = new FormData();
      
      // Extrai nome do arquivo da URI
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      
      // Converte URI para blob (forma simplificada para React Native)
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename
      } as any);

      const response = await api.post(`/occurrences/${occurrenceId}/images`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data.data || response.data
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload da imagem:', error);
      
      return {
        success: false,
        message: error.message || 'Erro ao fazer upload da imagem'
      };
    }
  },

  // Atualizar status de uma ocorrência
  async updateStatus(occurrenceId: string, status: string, reason?: string): Promise<ApiResponse<Occurrence>> {
    try {
      console.log(`📝 Atualizando status da ocorrência ${occurrenceId} para: ${status}`);
      
      const response = await api.patch(`/occurrences/${occurrenceId}/status`, { 
        status,
        reason: reason || 'Atualização via app móvel'
      });
      
      console.log('✅ Status atualizado com sucesso');
      
      return {
        success: true,
        data: response.data.data || response.data
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao atualizar status'
      };
    }
  },

  // Atualizar ocorrência
  async updateOccurrence(id: string, data: Partial<CreateOccurrenceData>): Promise<ApiResponse<Occurrence>> {
    try {
      console.log(`📝 Atualizando ocorrência ${id}`, data);
      
      const response = await api.put(`/occurrences/${id}`, data);
      
      console.log('✅ Ocorrência atualizada com sucesso');
      
      return {
        success: true,
        data: response.data.data || response.data
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar ocorrência:', error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao atualizar ocorrência'
      };
    }
  },

  // Buscar veículos disponíveis
  async getVehicles(): Promise<ApiResponse<any[]>> {
    try {
      console.log('🚗 Buscando viaturas...');
      const response = await api.get('/vehicles', {
        params: { active: true }
      });

      console.log(`✅ ${response.data?.length || 0} viaturas encontradas`);
      
      return {
        success: true,
        data: response.data.data || response.data || []
      };
      
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar viaturas:', {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status
      });
      
      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  },

  // ==================== FUNÇÕES PARA MUNICÍPIOS DE PERNAMBUCO ====================

  // Buscar municípios de Pernambuco
  async getMunicipalitiesPE(): Promise<ApiResponse<Municipality[]>> {
    try {
      console.log('🔍 Buscando municípios de PE...');
      
      // Tenta endpoint principal de municípios
      const response = await api.get('/municipios', {
        params: { active: true }
      });

      console.log(`✅ ${response.data?.length || 0} municípios encontrados`);
      
      // Se a resposta tiver estrutura {data: [...]}
      let municipalities: Municipality[] = [];
      if (response.data && response.data.data) {
        municipalities = response.data.data;
      } else if (Array.isArray(response.data)) {
        municipalities = response.data;
      } else if (response.data && Array.isArray(response.data.municipalities)) {
        municipalities = response.data.municipalities;
      }
      
      return {
        success: true,
        data: municipalities
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar municípios de PE:', {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Fallback: lista fixa de municípios de PE
      const municipiosPE: Municipality[] = [
        { id: 1, name: 'Recife' },
        { id: 2, name: 'Olinda' },
        { id: 3, name: 'Jaboatão dos Guararapes' },
        { id: 4, name: 'Paulista' },
        { id: 5, name: 'Caruaru' },
        { id: 6, name: 'Petrolina' },
        { id: 7, name: 'Garanhuns' },
        { id: 8, name: 'Vitória de Santo Antão' },
        { id: 9, name: 'Camaragibe' },
        { id: 10, name: 'São Lourenço da Mata' },
      ];
      
      console.log('🔄 Usando lista fixa de municípios de PE');
      
      return {
        success: true,
        data: municipiosPE
      };
    }
  },

  // Buscar municípios de PE por termo (para autocomplete)
  async searchMunicipalitiesPE(query: string): Promise<ApiResponse<Municipality[]>> {
    try {
      console.log(`🔍 Buscando municípios de PE: "${query}"`);
      
      // Busca todos os municípios de PE primeiro
      const result = await this.getMunicipalitiesPE();
      
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Erro ao buscar municípios');
      }
      
      // Filtra localmente pelo termo de busca
      const filtered = result.data.filter(mun => 
        mun.name.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log(`✅ ${filtered.length} sugestões encontradas`);
      
      return {
        success: true,
        data: filtered.slice(0, 10) // Limita a 10 resultados
      };
      
    } catch (error: any) {
      console.warn('Erro ao buscar municípios de PE:', error);
      
      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  },

  // Buscar ou criar município em PE
  async findOrCreateMunicipalityPE(municipalityName: string): Promise<ApiResponse<Municipality>> {
    try {
      const normalizedName = municipalityName.trim();
      console.log(`🔍 Processando município: "${normalizedName}" (PE)`);
      
      // 1. Primeiro busca se já existe
      const result = await this.getMunicipalitiesPE();
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Erro ao buscar municípios');
      }
      
      const existing = result.data.find(mun => 
        mun.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (existing) {
        console.log('✅ Município já existe:', existing.name);
        return {
          success: true,
          data: { ...existing, wasCreated: false }
        };
      }

      // 2. Tenta criar via API
      console.log(`🆕 Tentando criar novo município: ${normalizedName}`);
      
      try {
        const response = await api.post('/municipios', {
          name: normalizedName,
          stateUf: 'PE'
        });

        const newMunicipality = response.data.data || response.data;
        console.log('✅ Município criado via API:', newMunicipality);
        
        return {
          success: true,
          data: { ...newMunicipality, wasCreated: true }
        };
        
      } catch (createError: any) {
        console.warn('Erro ao criar município via API:', createError.message);
        
        // Se a API não permitir criação, retorna objeto local
        const localMunicipality: Municipality = {
          id: Date.now(),
          name: normalizedName,
          wasCreated: true
        };
        
        console.log('✅ Município criado localmente:', localMunicipality.name);
        
        return {
          success: true,
          data: localMunicipality
        };
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar/criar município em PE:', error.message);
      
      // Fallback: retorna objeto local mesmo com erro
      const fallbackMunicipality: Municipality = {
        id: Date.now(),
        name: municipalityName.trim(),
        wasCreated: true
      };
      
      return {
        success: true,
        data: fallbackMunicipality
      };
    }
  },

  // Converter localização para município/bairro
  async geocodeLocation(latitude: number, longitude: number): Promise<ApiResponse<{
    municipality?: string;
    neighborhood?: string;
    address?: string;
  }>> {
    try {
      // Usa serviço de geocodificação (exemplo com OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      const data = await response.json();
      
      if (data.address) {
        return {
          success: true,
          data: {
            municipality: data.address.city || data.address.town || data.address.village,
            neighborhood: data.address.suburb || data.address.neighbourhood,
            address: data.display_name,
          }
        };
      }
      
      return {
        success: true,
        data: {}
      };
      
    } catch (error: any) {
      console.warn('Erro no geocoding:', error);
      
      return {
        success: false,
        message: error.message,
        data: {}
      };
    }
  },

  // Função compatível com código antigo
  async getMunicipalities(): Promise<ApiResponse<any[]>> {
    return this.getMunicipalitiesPE();
  }
};