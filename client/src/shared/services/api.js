import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // FastAPI trả về lỗi trong trường `detail`, Node/Express thường trả về `message`
    const message = error.response?.data?.detail || error.response?.data?.message || 'Đã có lỗi xảy ra';
    return Promise.reject(new Error(message));
  }
);

// --- Simple API Cache cho các GET requests ---
const CACHE_DURATION = 30000; // 30 giây cache
export const apiCache = new Map();

export const clearApiCache = () => apiCache.clear();

const cachedGet = async (url, config = {}) => {
  const { forceRefresh, ...axiosConfig } = config;
  const key = url + JSON.stringify(axiosConfig.params || {});
  
  if (!forceRefresh) {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }
  
  const data = await apiClient.get(url, axiosConfig);
  apiCache.set(key, { data, timestamp: Date.now() });
  return data;
};

export const authService = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/me', data),
};

export const courtService = {
  getAll: (filters = {}, forceRefresh = false) => cachedGet('/courts', { params: filters, forceRefresh }),
  getById: (id) => apiClient.get(`/courts/${id}`),
  getNearby: (lat, lng, radius, forceRefresh = false) =>
    cachedGet('/courts/nearby', { params: { lat, lng, radius }, forceRefresh }),
};

export const gameRoomService = {
  getAll: (filters = {}, forceRefresh = false) => cachedGet('/gamerooms', { params: filters, forceRefresh }),
  getById: (id) => apiClient.get(`/gamerooms/${id}`),
  join: async (roomId) => {
    const res = await apiClient.post(`/gamerooms/${roomId}/join`);
    clearApiCache(); // Clear cache sau khi đổi data
    return res;
  },
  leave: async (roomId) => {
    const res = await apiClient.post(`/gamerooms/${roomId}/leave`);
    clearApiCache();
    return res;
  },
  create: async (data) => {
    const res = await apiClient.post('/gamerooms', data);
    clearApiCache();
    return res;
  },
  approveParticipant: async (roomId, userId, status) => {
    const res = await apiClient.patch(`/gamerooms/${roomId}/participants/${userId}/status`, { status });
    clearApiCache();
    return res;
  }
};

export const bookingService = {
  create: (data) => apiClient.post('/bookings', data),
  getAll: () => apiClient.get('/bookings'),
  getById: (id) => apiClient.get(`/bookings/${id}`),
  cancel: (id) => apiClient.patch(`/bookings/${id}/cancel`),
};

export const teamService = {
  getTopTeams: (sportId = null, limit = 10, forceRefresh = false) => 
    cachedGet('/teams/top', { params: { sport_id: sportId, limit }, forceRefresh }),
};

export const postService = {
  getAll: (filters = {}, forceRefresh = false) => cachedGet('/posts', { params: filters, forceRefresh }),
  create: async (formData) => {
    const res = await apiClient.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    clearApiCache(); // Clear cache sau khi tạo post mới
    return res;
  }
};

export const chatService = {
  getConversations: () => apiClient.get('/chat/conversations'),
  getOrCreateConversation: (userId) => apiClient.get(`/chat/conversations/${userId}`),
  getMessages: (conversationId) => apiClient.get(`/chat/messages/${conversationId}`),
};

export default apiClient;
