// API Client for ResiFlow Backend
// This service handles all HTTP requests to the backend API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      this.clearToken();
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: { email: string; password: string; name: string; role?: string }) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(data: { name?: string; avatar?: string }) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async verifyPin(pin: string) {
    return this.request('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  async setPin(pin: string, nightPin?: string) {
    return this.request('/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, nightPin }),
    });
  }

  // AI Service Endpoints
  async interpretLabs(patient: any) {
    return this.request('/ai/interpret-labs', {
        method: 'POST',
        body: JSON.stringify({ patient }),
    });
  }

  async scanLabs(base64Images: string[], patientNameContext: string) {
    return this.request('/ai/scan-labs', {
        method: 'POST',
        body: JSON.stringify({ base64Images, patientNameContext }),
    });
  }

  // Patient endpoints
  async getPatients() {
    return this.request('/patients');
  }

  async getAllPatients(filters?: { acuity?: string; isolation?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    return this.request(`/patients?${params}`);
  }

  async getPatientById(id: string) {
    return this.request(`/patients/${id}`);
  }

  async createPatient(data: any) {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePatient(id: string, data: any) {
    return this.request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePatient(id: string) {
    return this.request(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  async getStatistics() {
    return this.request('/patients/statistics');
  }

  // Task endpoints
  async addTask(patientId: string, task: any) {
    return this.request(`/patients/${patientId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(patientId: string, taskId: string, task: any) {
    return this.request(`/patients/${patientId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  }

  async deleteTask(patientId: string, taskId: string) {
    return this.request(`/patients/${patientId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Medication endpoints
  async addMedication(patientId: string, medication: any) {
    return this.request(`/patients/${patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(medication),
    });
  }

  async updateMedication(patientId: string, medicationId: string, medication: any) {
    return this.request(`/patients/${patientId}/medications/${medicationId}`, {
      method: 'PUT',
      body: JSON.stringify(medication),
    });
  }

  // Lab endpoints
  async addLabResult(patientId: string, lab: { labType: string; date: string; value: any; unit?: string }) {
    return this.request(`/patients/${patientId}/labs`, {
      method: 'POST',
      body: JSON.stringify(lab),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
