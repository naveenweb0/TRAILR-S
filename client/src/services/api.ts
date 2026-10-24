function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://trailr-s.onrender.com/api/v1';
  }
  return '/api/v1';
}

const API_BASE = getApiBaseUrl().replace(/\/$/, '');

function getHeaders(token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeToken = token || localStorage.getItem('schooldest_token');
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status} error`;
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  neonLogin: (sessionToken: string) =>
    request('/auth/neon-login', { method: 'POST', body: JSON.stringify({ sessionToken }) }),
  selectPortal: (portalType: 'SCHOOL' | 'DESTINATION') =>
    request('/auth/portal-selection', { method: 'POST', body: JSON.stringify({ portalType }) }),
  firebaseLogin: (idToken: string) =>
    request('/auth/firebase-login', { method: 'POST', body: JSON.stringify({ idToken }) }),
  registerSchool: (schoolData: any) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(schoolData) }),
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  getMe: () => request('/auth/me'),
  checkHealth: () => request('/health'),

  // Destinations (Public)
  getDestinations: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/destinations${query ? `?${query}` : ''}`);
  },
  getDestinationDetail: (slug: string) => request(`/destinations/detail/${slug}`),
  getDestinationAvailability: (id: string, year: number, month: number) =>
    request(`/destinations/${id}/availability?year=${year}&month=${month}`),

  // Destination Management (Destination Portal)
  onboardDestination: (data: any) =>
    request('/destinations/onboard', { method: 'POST', body: JSON.stringify(data) }),
  getDestinationOnboardingStatus: () => request('/destinations/me/onboarding-status'),
  getMyDestinationProfile: () => request('/destinations/me/profile'),
  updateMyDestinationProfile: (profile: any) =>
    request('/destinations/me/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  updateTicketType: (id: string, data: any) =>
    request(`/destinations/me/ticket-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateFacility: (id: string, data: any) =>
    request(`/destinations/me/facilities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateDateAvailability: (payload: { date: string; status: string; dailyCapacity?: number; notes?: string }) =>
    request('/destinations/me/availability', { method: 'POST', body: JSON.stringify(payload) }),
  getDestinationBookings: (status?: string) =>
    request(`/destinations/me/bookings${status ? `?status=${status}` : ''}`),
  acceptBooking: (id: string, notes?: string) =>
    request(`/destinations/me/bookings/${id}/accept`, { method: 'POST', body: JSON.stringify({ destinationNotes: notes }) }),
  rejectBooking: (id: string, reason: string) =>
    request(`/destinations/me/bookings/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  requestBookingChanges: (id: string, changes: { proposedDate?: string; proposedStudentCount?: number; reason: string }) =>
    request(`/destinations/me/bookings/${id}/request-changes`, { method: 'POST', body: JSON.stringify(changes) }),
  getDestinationReports: () => request('/destinations/me/reports'),

  // School Portal
  onboardSchool: (data: any) =>
    request('/school/onboard', { method: 'POST', body: JSON.stringify(data) }),
  getSchoolOnboardingStatus: () => request('/school/onboarding-status'),
  getMySchool: () => request('/school/me'),
  updateMySchool: (data: any) => request('/school/me', { method: 'PUT', body: JSON.stringify(data) }),
  getMyBookings: (status?: string) => request(`/school/bookings${status ? `?status=${status}` : ''}`),
  getBookingDetail: (id: string) => request(`/school/bookings/${id}`),
  createBooking: (bookingData: any) =>
    request('/school/bookings', { method: 'POST', body: JSON.stringify(bookingData) }),
  respondToChangeRequest: (id: string, payload: { changeRequestId: string; action: 'ACCEPT' | 'REJECT'; schoolResponseNotes?: string }) =>
    request(`/school/bookings/${id}/respond-change`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelBooking: (id: string, reason?: string) =>
    request(`/school/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Admin Portal
  getAdminOverview: () => request('/admin/overview'),
  listAllDestinations: () => request('/admin/destinations'),
  getAdminDestinationDetail: (id: string) => request(`/admin/destinations/${id}`),
  adminOnboardDestination: (data: any) =>
    request('/admin/destinations/onboard', { method: 'POST', body: JSON.stringify(data) }),
  updateDestinationStatus: (id: string, status: string, isVerified?: boolean, reason?: string) =>
    request(`/admin/destinations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, isVerified, reason }) }),
  updateAdminDestinationAvailability: (id: string, payload: any) =>
    request(`/admin/destinations/${id}/availability`, { method: 'POST', body: JSON.stringify(payload) }),
  processProposalDecision: (id: string, decision: string, reason?: string) =>
    request(`/admin/destinations/${id}/proposal-decision`, {
      method: 'POST',
      body: JSON.stringify({
        action: decision === 'APPROVED' ? 'APPROVE' : decision === 'CHANGES_REQUESTED' ? 'REQUEST_CHANGES' : decision === 'REJECTED' ? 'REJECT' : decision,
        reason,
      }),
    }),
  listAllSchools: () => request('/admin/schools'),
  getAdminSchoolDetail: (id: string) => request(`/admin/schools/${id}`),
  updateSchoolVerification: (id: string, verificationStatus: string, verificationNotes?: string) =>
    request(`/admin/schools/${id}/verification`, { method: 'PUT', body: JSON.stringify({ verificationStatus, verificationNotes }) }),
  updateUserStatus: (id: string, isActive: boolean) =>
    request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  listAllBookings: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/bookings${query ? `?${query}` : ''}`);
  },
  getAdminBookingDetail: (id: string) => request(`/admin/bookings/${id}`),
  listTravellerRequests: (status?: string) =>
    request(`/admin/traveller-requests${status ? `?status=${status}` : ''}`),
  updateTravellerRequest: (id: string, data: any) =>
    request(`/admin/traveller-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: () => request('/admin/audit-logs'),
  getPlatformSettings: () => request('/admin/settings'),
  updatePlatformSetting: (key: string, value: any) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),

  // Uploads
  uploadImageFile: async (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    const token = localStorage.getItem('schooldest_token');
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    return res.json();
  },
  uploadImageUrl: (imageUrl: string, folder?: string) =>
    request('/upload/image', { method: 'POST', body: JSON.stringify({ imageUrl, folder }) }),
  uploadDestinationCover: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('schooldest_token');
    const res = await fetch(`${API_BASE}/upload/destination/${id}/cover`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    return res.json();
  },
  uploadDestinationGallery: async (id: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    const token = localStorage.getItem('schooldest_token');
    const res = await fetch(`${API_BASE}/upload/destination/${id}/gallery`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    return res.json();
  },
  deleteDestinationGalleryImage: (id: string, imageId: string) =>
    request(`/upload/destination/${id}/gallery/${imageId}`, { method: 'DELETE' }),
  uploadSchoolLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('schooldest_token');
    const res = await fetch(`${API_BASE}/upload/school/${id}/logo`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    return res.json();
  },
  getUploadSignature: (entityType: string, entityId?: string, category?: string) =>
    request('/upload/sign', { method: 'POST', body: JSON.stringify({ entityType, entityId, category }) }),
};
