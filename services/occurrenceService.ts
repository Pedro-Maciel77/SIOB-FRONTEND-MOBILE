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
  createdBy?: string; // ← Tornado opcional para compatibilidade
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
  search?: string;
}

// Interface para resposta paginada
export interface OccurrenceListResponse {
  occurrences: Occurrence[];
  total: number;
  page: number;
  totalPages: number;
  counts?: {
    total: number;
    aberto: number;
    em_andamento: number;
    finalizado: number;
    alerta: number;
  };
}

// Interface para resposta da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Interface para município
export interface MunicipalityPE {
  id: number;
  name: string;
}

// Interface para viatura
export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  status?: string;
}

export const occurrenceService = {
  // ==================== FUNÇÕES PRINCIPAIS ====================

  async createOccurrence(data: CreateOccurrenceData): Promise<ApiResponse<Occurrence>> {
    try {
      console.log('📤 Criando ocorrência:', data);
      
      const response = await api.post('/occurrences', data);
      
      console.log('✅ Ocorrência criada com sucesso:', response.data);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao criar ocorrência:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao criar ocorrência',
        error: error.code
      };
    }
  },

  async getOccurrenceById(id: string): Promise<ApiResponse<Occurrence>> {
    try {
      const response = await api.get(`/occurrences/${id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao buscar ocorrência:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao buscar ocorrência'
      };
    }
  },

  async updateOccurrence(id: string, data: Partial<CreateOccurrenceData>): Promise<ApiResponse<Occurrence>> {
    try {
      const response = await api.put(`/occurrences/${id}`, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao atualizar ocorrência:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao atualizar ocorrência'
      };
    }
  },

  async deleteOccurrence(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/occurrences/${id}`);
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao excluir ocorrência:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao excluir ocorrência'
      };
    }
  },

  // ==================== FUNÇÕES PARA MUNICÍPIOS ====================

  async getMunicipalitiesPE(): Promise<MunicipalityPE[]> {
    try {
      console.log('🏙️ Buscando municípios de PE...');
      
      const response = await api.get('/municipalities/pe');
      
      // Extrai os dados dependendo do formato da resposta
      let municipalities: MunicipalityPE[] = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        municipalities = response.data.data;
      } else if (Array.isArray(response.data)) {
        municipalities = response.data;
      } else if (response.data?.municipalities) {
        municipalities = response.data.municipalities;
      }
      
      console.log(`✅ ${municipalities.length} municípios de PE encontrados`);
      return municipalities;
      
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar municípios PE:', error.message);
      
      // Fallback para desenvolvimento
      const fallbackMunicipios: MunicipalityPE[] = [
        { id: 1, name: 'Recife' },
        { id: 2, name: 'Olinda' },
        { id: 3, name: 'Jaboatão dos Guararapes' },
        { id: 4, name: 'Paulista' },
        { id: 5, name: 'Cabo de Santo Agostinho' },
        { id: 6, name: 'Camaragibe' },
        { id: 7, name: 'São Lourenço da Mata' },
        { id: 8, name: 'Igarassu' },
        { id: 9, name: 'Abreu e Lima' },
        { id: 10, name: 'Goiana' },
      ];
      
      return fallbackMunicipios;
    }
  },

  async searchMunicipalitiesPE(term: string): Promise<MunicipalityPE[]> {
    try {
      console.log(`🔍 Buscando municípios com termo: ${term}`);
      
      const response = await api.get(`/municipalities/pe/search`, {
        params: { term }
      });
      
      let municipalities: MunicipalityPE[] = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        municipalities = response.data.data;
      } else if (Array.isArray(response.data)) {
        municipalities = response.data;
      } else if (response.data?.municipalities) {
        municipalities = response.data.municipalities;
      }
      
      console.log(`✅ ${municipalities.length} sugestões encontradas`);
      return municipalities;
      
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar sugestões:', error.message);
      return [];
    }
  },

  async findOrCreateMunicipalityPE(name: string): Promise<MunicipalityPE & { wasCreated: boolean }> {
    try {
      console.log(`🔄 Buscando ou criando município: "${name}"`);
      
      const response = await api.post('/municipalities/pe/find-or-create', { name });
      
      let result;
      
      if (response.data?.data) {
        result = response.data.data;
      } else if (response.data) {
        result = response.data;
      } else {
        throw new Error('Resposta inválida da API');
      }
      
      console.log(`✅ Município processado: ${result.name} (${result.wasCreated ? 'criado' : 'existente'})`);
      return result;
      
    } catch (error: any) {
      console.error('❌ Erro em findOrCreateMunicipalityPE:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Fallback: cria um objeto local se a API falhar
      return {
        id: Date.now(), // ID temporário
        name: name,
        wasCreated: true
      };
    }
  },

  // ==================== FUNÇÕES PARA VIATURAS ====================

  async getVehicles(): Promise<Vehicle[]> {
    try {
      console.log('🚗 Buscando viaturas...');
      
      const response = await api.get('/vehicles', {
        params: { active: true, available: true }
      });
      
      let vehicles: Vehicle[] = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        vehicles = response.data.data;
      } else if (Array.isArray(response.data)) {
        vehicles = response.data;
      } else if (response.data?.vehicles) {
        vehicles = response.data.vehicles;
      }
      
      console.log(`✅ ${vehicles.length} viaturas encontradas`);
      return vehicles;
      
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar viaturas:', error.message);
      
      // Fallback para desenvolvimento
      const fallbackVehicles: Vehicle[] = [
        { id: '1', plate: 'ABC-1234', name: 'Viatura 01' },
        { id: '2', plate: 'DEF-5678', name: 'Viatura 02' },
        { id: '3', plate: 'GHI-9012', name: 'Viatura 03' },
      ];
      
      return fallbackVehicles;
    }
  },

  // ==================== FUNÇÕES PARA IMAGENS ====================

  async uploadImage(occurrenceId: string, imageUri: string): Promise<ApiResponse<any>> {
    try {
      console.log(`🖼️ Upload de imagem para ocorrência ${occurrenceId}`);
      
      const formData = new FormData();
      
      // Cria um objeto File a partir da URI
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        type,
        name: filename
      } as any);
      
      const response = await api.post(`/occurrences/${occurrenceId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Imagem enviada com sucesso');
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload da imagem:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao enviar imagem'
      };
    }
  },

  async deleteImage(occurrenceId: string, imageId: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/occurrences/${occurrenceId}/images/${imageId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao excluir imagem:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao excluir imagem'
      };
    }
  },

  // ==================== FUNÇÕES PARA LISTAGEM ====================
  
  async getOccurrences(filters?: OccurrenceFilters): Promise<ApiResponse<OccurrenceListResponse>> {
    try {
      console.log('🔍 Buscando ocorrências...', { filters, baseURL: api.defaults.baseURL });
      
      const params: any = {};
      
      if (filters) {
        if (filters.page) params.page = filters.page;
        if (filters.limit) params.limit = filters.limit;
        if (filters.municipality) params.municipality = filters.municipality;
        if (filters.status) params.status = filters.status;
        if (filters.type) params.type = filters.type;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.createdBy) params.createdBy = filters.createdBy;
        if (filters.vehicleId) params.vehicleId = filters.vehicleId;
        if (filters.neighborhood) params.neighborhood = filters.neighborhood;
        if (filters.search) params.search = filters.search;
      }
      
      console.log('📤 Parâmetros:', params);
      
      const response = await api.get('/occurrences', { params });
      
      console.log('✅ Resposta da API:', {
        status: response.status,
        hasData: !!response.data,
        structure: response.data ? Object.keys(response.data) : 'no data'
      });
      
      let occurrences: Occurrence[] = [];
      let total = 0;
      let page = filters?.page || 1;
      let counts = undefined;
      
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        occurrences = data.occurrences || [];
        total = data.total || data.occurrences?.length || 0;
        page = data.page || page;
        counts = data.counts;
      } else if (response.data?.occurrences) {
        occurrences = response.data.occurrences;
        total = response.data.total || response.data.occurrences.length;
        page = response.data.page || page;
        counts = response.data.counts;
      } else if (Array.isArray(response.data)) {
        occurrences = response.data;
        total = response.data.length;
      } else if (response.data?.data?.occurrences) {
        occurrences = response.data.data.occurrences;
        total = response.data.data.total || response.data.data.occurrences.length;
        page = response.data.data.page || page;
        counts = response.data.data.counts;
      }
      
      console.log(`📋 ${occurrences.length} ocorrências processadas`);
      
      return {
        success: true,
        data: {
          occurrences,
          total,
          page,
          totalPages: Math.ceil(total / (filters?.limit || 10)),
          counts
        }
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar ocorrências:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: api.defaults.baseURL
      });
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao carregar ocorrências',
        error: error.code === 'ECONNABORTED' ? 'timeout' : 'network_error',
        data: {
          occurrences: [],
          total: 0,
          page: filters?.page || 1,
          totalPages: 0
        }
      };
    }
  },

  // ==================== FUNÇÕES COMPATIBILIDADE ====================
  
  async getMunicipalities(): Promise<ApiResponse<any[]>> {
    try {
      console.log('🏙️ Buscando municípios...');
      
      const response = await api.get('/municipios', {
        params: { active: true }
      });
      
      let municipalities = [];
      
      if (response.data?.data) {
        municipalities = response.data.data;
      } else if (Array.isArray(response.data)) {
        municipalities = response.data;
      } else if (response.data?.municipalities) {
        municipalities = response.data.municipalities;
      }
      
      console.log(`✅ ${municipalities.length} municípios encontrados`);
      
      return {
        success: true,
        data: municipalities
      };
      
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar municípios:', error.message);
      
      const municipiosPE = [
        { id: 1, name: 'Recife' },
        { id: 2, name: 'Olinda' },
        { id: 3, name: 'Jaboatão dos Guararapes' },
      ];
      
      return {
        success: true,
        data: municipiosPE
      };
    }
  }
};