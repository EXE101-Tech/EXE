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
  logout: (token) => apiClient.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } }),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/me', data),
  getStats: () => apiClient.get('/auth/me/stats'),
};

export const resolveMediaUrl = (path) => {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path || '';
  const apiBase = new URL(apiClient.defaults.baseURL, window.location.origin);
  return new URL(path, apiBase.origin).toString();
};

export const storageService = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const result = await apiClient.post('/storage/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return result.url;
  },
};

export const sportService = {
  getAll: () => apiClient.get('/courts/sports'),
};

export const searchService = {
  search: (query) => apiClient.get('/search', { params: { q: query, limit: 6 } }),
};

export const courtService = {
  getAll: (filters = {}) => apiClient.get('/courts', { params: filters }),
  getById: (id) => apiClient.get(`/courts/${id}`),
  getNearby: (lat, lng, radius) =>
    apiClient.get('/courts/nearby', { params: { lat, lng, radius } }),
  getVenues: () => apiClient.get('/courts/venues'),
  getVenueById: (id) => apiClient.get(`/courts/venues/${id}`),
};

export const ownerService = {
  getStatus: () => apiClient.get('/courts/owner/status'),
  register: () => apiClient.post('/courts/owner/register', { accepted_terms: true }),
  cancelRegistration: () => apiClient.delete('/courts/owner/registration'),
  getVenues: () => apiClient.get('/courts/owner/venues'),
  createVenue: (data) => apiClient.post('/courts/owner/venues', data),
    updateVenue: (id, data) => apiClient.put(`/courts/owner/venues/${id}`, data),
    removeVenue: (id) => apiClient.delete(`/courts/owner/venues/${id}`),
    getSchedule: (id, date) => apiClient.get(`/courts/owner/venues/${id}/schedule`, { params: { date } }),
    createExternalBlock: (id, data) => apiClient.post(`/courts/owner/venues/${id}/schedule/blocks`, data),
    removeExternalBlock: (id, blockId) => apiClient.delete(`/courts/owner/venues/${id}/schedule/blocks/${blockId}`),
};

export const gameRoomService = {
  getAll: (filters = {}) => apiClient.get('/gamerooms', { params: filters }),
  getById: (id) => apiClient.get(`/gamerooms/${id}`),
  join: (roomId, note = '') => apiClient.post(`/gamerooms/${roomId}/join`, { note }),
  leave: (roomId) => apiClient.post(`/gamerooms/${roomId}/leave`),
  create: (data) => apiClient.post('/gamerooms', data),
  approveParticipant: (roomId, userId, status) => 
    apiClient.patch(`/gamerooms/${roomId}/participants/${userId}/status`, { status }),
};

export const teamService = {
  getAll: (filters = {}) => apiClient.get('/teams', { params: filters }),
  create: (data) => apiClient.post('/teams', data),
  update: (id, data) => apiClient.patch(`/teams/${id}`, data),
  remove: (id) => apiClient.delete(`/teams/${id}`),
  join: (id) => apiClient.post(`/teams/${id}/join`),
  leave: (id) => apiClient.delete(`/teams/${id}/membership`),
  getMembers: (id, status) => apiClient.get(`/teams/${id}/members`, { params: status ? { status } : {} }),
  setMemberStatus: (id, userId, status) => apiClient.patch(`/teams/${id}/members/${userId}`, { status }),
  getReviews: (id) => apiClient.get(`/teams/${id}/reviews`),
  review: (id, data) => apiClient.post(`/teams/${id}/reviews`, data),
};

export const lfgService = {
  getAll: (filters = {}) => apiClient.get('/lfg/posts', { params: filters }),
  create: (data) => apiClient.post('/lfg/posts', data),
  update: (id, data) => apiClient.put(`/lfg/posts/${id}`, data),
  join: (id) => apiClient.post(`/lfg/posts/${id}/join`),
  leave: (id) => apiClient.delete(`/lfg/posts/${id}/membership`),
  cancel: (id) => apiClient.delete(`/lfg/posts/${id}`),
};

export const chatService = {
  getConversations: () => apiClient.get('/chat/conversations'),
  startConversation: (recipientId) => apiClient.post('/chat/conversations', { recipient_id: recipientId }),
  getMessages: (conversationId) => apiClient.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, text) => apiClient.post(`/chat/conversations/${conversationId}/messages`, { text }),
  searchUsers: (query) => apiClient.get('/chat/users', { params: { q: query, limit: 30 } }),
  getFriends: () => apiClient.get('/chat/friends'),
  getFriendRequests: () => apiClient.get('/chat/friends/requests'),
  sendFriendRequest: (userId) => apiClient.post('/chat/friends/requests', { recipient_id: userId }),
  acceptFriendRequest: (friendshipId) => apiClient.post(`/chat/friends/requests/${friendshipId}/accept`),
  removeFriendship: (friendshipId) => apiClient.delete(`/chat/friends/${friendshipId}`),
};

export const bookingService = {
    getAvailability: (venueId, date) => apiClient.get('/bookings/availability', { params: { venue_id: venueId, date } }),
    create: (data) => apiClient.post('/bookings', data),
    createBatch: (bookings) => apiClient.post('/bookings/batch', { bookings }),
  getAll: () => apiClient.get('/bookings'),
  getById: (id) => apiClient.get(`/bookings/${id}`),
  cancel: (id) => apiClient.patch(`/bookings/${id}/cancel`),
};

export default apiClient;
