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

export const authService = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/me', data),
};

export const courtService = {
  getAll: (filters = {}) => apiClient.get('/courts', { params: filters }),
  getById: (id) => apiClient.get(`/courts/${id}`),
  getNearby: (lat, lng, radius) =>
    apiClient.get('/courts/nearby', { params: { lat, lng, radius } }),
};

export const gameRoomService = {
  getAll: (filters = {}) => apiClient.get('/gamerooms', { params: filters }),
  getById: (id) => apiClient.get(`/gamerooms/${id}`),
  join: (roomId) => apiClient.post(`/gamerooms/${roomId}/join`),
  leave: (roomId) => apiClient.post(`/gamerooms/${roomId}/leave`),
  create: (data) => apiClient.post('/gamerooms', data),
  approveParticipant: (roomId, userId, status) => 
    apiClient.patch(`/gamerooms/${roomId}/participants/${userId}/status`, { status }),
};

export const bookingService = {
  create: (data) => apiClient.post('/bookings', data),
  getAll: () => apiClient.get('/bookings'),
  getById: (id) => apiClient.get(`/bookings/${id}`),
  cancel: (id) => apiClient.patch(`/bookings/${id}/cancel`),
};

export default apiClient;
