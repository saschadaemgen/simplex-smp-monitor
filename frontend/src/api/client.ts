/**
 * SimpleX SMP Monitor by cannatoshi
 * GitHub: https://github.com/cannatoshi/simplex-smp-monitor
 * Licensed under AGPL-3.0
 * 
 * API Client
 * 
 * Contains:
 * - Type definitions for all API responses
 * - API client functions for all endpoints
 * - Dashboard, Servers, Categories, Tests, Events
 * - SimpleX Clients with latency history and reset actions
 * - Docker hosting support for servers (v0.1.12)
 * - Docker Manager for container management (v0.1.13)
 */

const API_BASE = '/api/v1';

// =============================================================================
// BASE FETCH HELPER
// =============================================================================

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    // Try to get error details from response body
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.name) {
        // Django validation errors often come as field: [errors]
        errorMessage = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch {
      // Could not parse JSON, use default message
    }
    throw new Error(errorMessage);
  }
  
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Get CSRF token from cookies
function getCsrfToken(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'csrftoken') return value;
  }
  return '';
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface DashboardStats {
  total_servers: number;
  active_servers: number;
  online_servers: number;
  offline_servers: number;
  smp_servers: number;
  xftp_servers: number;
  onion_servers: number;
  total_tests: number;
  active_tests: number;
  running_tests: number;
  total_clients: number;
  running_clients: number;
  total_events: number;
  error_events_24h: number;
  avg_latency: number | null;
  overall_uptime: number | null;
}

export interface ActivityData {
  hour: string;
  checks: number;
  online: number;
  offline: number;
  avg_latency: number | null;
}

export interface LatencyData {
  server_id: number;
  server_name: string;
  avg_latency: number | null;
  min_latency: number | null;
  max_latency: number | null;
  last_latency: number | null;
}

// =============================================================================
// SERVER TYPES
// =============================================================================

export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  server_count: number;
  online_server_count: number;
  created_at: string;
  updated_at: string;
}

// Server type options - NOW INCLUDES 'ntf'
export type ServerType = 'smp' | 'xftp' | 'ntf';

// Hosting mode options (NEW)
export type HostingMode = 'ip' | 'tor' | 'chutnex';

// Docker status options (NEW)
export type DockerStatus = 
  | 'not_created' 
  | 'created' 
  | 'starting' 
  | 'running' 
  | 'stopping' 
  | 'stopped' 
  | 'error';

export interface Server {
  id: number;
  name: string;
  server_type: ServerType;  // Updated to include 'ntf'
  address?: string;
  host: string;
  fingerprint: string;
  password?: string;
  description?: string;
  location?: string;
  is_active: boolean;
  maintenance_mode: boolean;
  last_status: 'online' | 'offline' | 'error' | 'unknown' | null;
  last_latency: number | null;
  last_check: string | null;
  last_error?: string;
  is_onion: boolean;
  uptime_percent: number | null;
  categories: Category[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // ==========================================================================
  // Docker Hosting Fields (v0.1.12)
  // ==========================================================================
  is_docker_hosted?: boolean;
  docker_status?: DockerStatus;
  docker_status_display?: string;
  docker_error?: string;
  container_id?: string;
  container_name?: string;
  data_volume?: string;
  config_volume?: string;
  exposed_port?: number;
  generated_fingerprint?: string;
  generated_address?: string;
  effective_address?: string;
  is_docker_running?: boolean;
  docker_image_name?: string;
  default_internal_port?: number;
  
  // ==========================================================================
  // Hosting Mode Fields (NEW v0.1.13)
  // ==========================================================================
  hosting_mode?: HostingMode;
  hosting_mode_display?: string;
  host_ip?: string;
  onion_address?: string;
  is_tor_hosted?: boolean;
  effective_host?: string;
  chutnex_network?: string | null;
}

export interface ServerFilters {
  type?: ServerType;
  status?: string;
  active?: boolean;
  maintenance?: boolean;
  category?: number;
  onion?: boolean;
  is_docker_hosted?: boolean;  // NEW
  docker_status?: DockerStatus;  // NEW
}

export interface ServerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Server[];
}

export interface CategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
}

// =============================================================================
// NEW: Docker Action Types (v0.1.12)
// =============================================================================

export type DockerAction = 'start' | 'stop' | 'restart' | 'delete';

export interface DockerActionRequest {
  action: DockerAction;
  remove_volumes?: boolean;
}

export interface DockerActionResponse {
  success: boolean;
  message: string;
  docker_status: DockerStatus;
  docker_status_display: string;
  generated_address?: string;
}

export interface DockerLogsResponse {
  logs: string;
  container_name: string;
  container_status: string;
}

export interface DockerImageModeStatus {
  ip: boolean;
  tor: boolean;
}

export interface DockerImagesStatus {
  smp: DockerImageModeStatus;
  xftp: DockerImageModeStatus;
  ntf: DockerImageModeStatus;
}

export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  server_type: string;
  server_name: string;
  hosting_mode?: string;  // NEW
}

export interface DockerContainersResponse {
  containers: DockerContainer[];
  count: number;
}

export interface CleanupOrphanedResponse {
  removed: number;
  message: string;
}

// =============================================================================
// TEST & EVENT TYPES
// =============================================================================

export interface Test {
  id: number;
  name: string;
  test_type: string;
  is_active: boolean;
  status: string;
  last_run: string | null;
  created_at: string;
  server_count?: number;
  success_rate?: number;
}

export interface Event {
  id: number;
  event_type: string;
  severity: string;
  level: string;
  source: string;
  message: string;
  server_name?: string;
  created_at: string;
}

export interface TestListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Test[];
}

export interface EventListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

// =============================================================================
// CLIENT TYPES (SimpleX CLI Clients)
// =============================================================================

export interface SimplexClient {
  id: string;
  name: string;
  slug: string;
  profile_name: string;
  description: string;
  websocket_port: number;
  status: 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  status_display: string;
  // Connection Mode
  connection_mode: 'direct' | 'public_tor' | 'chutnex_internal' | 'chutnex_external';
  chutnex_network?: string | null;
  chutnex_socks_port?: number | null;
  
  // Legacy compatibility (computed property)
  use_tor: boolean;
  messages_sent: number;
  messages_received: number;
  messages_failed: number;
  messages_delivered: number;
  connection_count: number;
  uptime_display: string | null;
  delivery_success_rate: number;
  created_at: string;
  last_active_at: string | null;
  started_at: string | null;
  last_error?: string;
  container_id?: string;
  container_name?: string;
  data_volume?: string;
  avg_latency_ms?: number | null;
  min_latency_ms?: number | null;
  max_latency_ms?: number | null;
  smp_server_ids?: number[];
}

// Alias for backwards compatibility
export type Client = SimplexClient;

export interface ClientConnection {
  id: string;
  client_a: string;
  client_b: string;
  client_a_name: string;
  client_b_name: string;
  client_a_slug: string;
  client_b_slug: string;
  client_a_profile: string;
  client_b_profile: string;
  contact_name_on_a: string;
  contact_name_on_b: string;
  status: 'pending' | 'connecting' | 'connected' | 'failed' | 'deleted';
  status_display: string;
  created_at: string;
  connected_at: string | null;
}

export interface ClientStats {
  total: number;
  running: number;
  stopped: number;
  error: number;
  total_messages_sent: number;
  total_messages_received: number;
  available_ports: number[];
}

export interface ClientListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SimplexClient[];
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface TestMessage {
  id: string;
  tracking_id: string;
  sender: number;
  recipient: number;
  sender_name: string;
  recipient_name: string;
  sender_profile: string;
  recipient_profile: string;
  content: string;
  content_clean: string;
  direction?: 'sent' | 'received';
  delivery_status: 'sending' | 'sent' | 'delivered' | 'failed';
  status_display: string;
  latency_to_server_ms: number | null;
  latency_to_client_ms: number | null;
  total_latency_ms: number | null;
  sent_at: string | null;
  client_received_at: string | null;
  created_at: string;
}

// =============================================================================
// LATENCY HISTORY TYPES
// =============================================================================

export interface LatencyHistoryEntry {
  id: string;
  tracking_id: string;
  sender_name: string;
  recipient_name: string;
  sender_profile: string;
  recipient_profile: string;
  content_preview: string;
  delivery_status: string;
  status_display?: string;
  total_latency_ms: number | null;
  latency_to_server_ms: number | null;
  latency_to_client_ms: number | null;
  sent_at: string | null;
  client_received_at: string | null;
  latency_indicator: 'green' | 'yellow' | 'red' | 'gray';
  created_at: string;
}

export interface LatencyHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LatencyHistoryEntry[];
}

export interface LatencyHistoryParams {
  page?: number;
  page_size?: number;
  sort?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface LatencyTimeSeriesPoint {
  timestamp: string;
  latency: number;
  message_id: string;
  sender_profile: string;
  recipient_profile: string;
}

export interface LatencyStats {
  avg_latency: number;
  min_latency: number | null;
  max_latency: number | null;
  total_messages: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
  time_series: LatencyTimeSeriesPoint[];
  time_range: string;
}

export interface RecentLatency {
  latency: number;
  timestamp: string;
}

export interface RecentLatencyResponse {
  data: RecentLatency[];
  count: number;
}

// =============================================================================
// RESET ACTION TYPES
// =============================================================================

export interface ResetResponse {
  success: boolean;
  message: string;
  deleted_count?: number;
  reset_values?: {
    messages_sent: number;
    messages_received: number;
    messages_failed: number;
  };
}

// =============================================================================
// DOCKER MANAGER TYPES (v0.1.13 - Container Management)
// =============================================================================

export interface DockerManagerInfo {
  containers_running: number;
  containers_paused: number;
  containers_stopped: number;
  containers_total: number;
  images_total: number;
  docker_version: string;
  os: string;
  architecture: string;
  memory_total: number;
  cpus: number;
  kernel_version: string;
}

export interface ContainerPort {
  container_port: string;
  host_bindings: Array<{
    host_ip: string;
    host_port: string;
  }>;
}

export interface ContainerState {
  running: boolean;
  paused: boolean;
  restarting: boolean;
  oom_killed: boolean;
  dead: boolean;
  exit_code: number;
  error: string;
  started_at: string;
  finished_at: string;
}

export interface DockerManagedContainer {
  id: string;
  short_id: string;
  name: string;
  status: string;
  image: string;
  created: string;
  ports: ContainerPort[];
  state: ContainerState;
  health?: {
    status: string;
    failing_streak: number;
  };
  host_config?: {
    memory_limit: number;
    cpu_shares: number;
    restart_policy: string;
    network_mode: string;
  };
  networks?: Record<string, {
    ip_address: string;
    gateway: string;
  }>;
  mounts?: Array<{
    type: string;
    source: string;
    destination: string;
    mode: string;
  }>;
  labels?: Record<string, string>;
}

export interface ContainerStats {
  container_id: string;
  name?: string;
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  memory_percent: number;
  network_rx: number;
  network_tx: number;
  block_read: number;
  block_write: number;
  timestamp: string;
  status?: string;
}

export interface ContainerListResponse {
  containers: DockerManagedContainer[];
  stats: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
    other: number;
  };
  docker_connected: boolean;
}

export interface ContainerActionResult {
  success: boolean;
  message?: string;
  error?: string;
  container_id?: string;
  status?: string;
}

export interface ContainerLogsResponse {
  container_id: string;
  logs: string;
  tail: number;
}

export interface PruneResult {
  success: boolean;
  containers_deleted: string[];
  space_reclaimed: number;
}

export interface BulkActionResult {
  results: Array<{
    container_id: string;
    success: boolean;
    message?: string;
    error?: string;
  }>;
  total: number;
  success: number;
  failed: number;
}

// =============================================================================
// DASHBOARD API
// =============================================================================

export const dashboardApi = {
  getStats: () => apiFetch<DashboardStats>('/dashboard/stats/'),
  getActivity: (hours = 24) => apiFetch<ActivityData[]>(`/dashboard/activity/?hours=${hours}`),
  getLatency: (hours = 24) => apiFetch<LatencyData[]>(`/dashboard/latency/?hours=${hours}`),
  getRecentServers: (limit = 10) => apiFetch<Server[]>(`/dashboard/servers/?limit=${limit}`),
  getRecentTests: (limit = 10) => apiFetch<Test[]>(`/dashboard/tests/?limit=${limit}`),
  getRecentEvents: (limit = 10) => apiFetch<Event[]>(`/dashboard/events/?limit=${limit}`),
};

// =============================================================================
// SERVERS API (Extended with Docker support)
// =============================================================================

export const serversApi = {
  // Standard CRUD
  list: (filters?: ServerFilters) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set('server_type', filters.type);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.active !== undefined) params.set('is_active', String(filters.active));
    if (filters?.maintenance !== undefined) params.set('maintenance_mode', String(filters.maintenance));
    if (filters?.category) params.set('category', String(filters.category));
    if (filters?.onion) params.set('onion', String(filters.onion));
    if (filters?.is_docker_hosted !== undefined) params.set('is_docker_hosted', String(filters.is_docker_hosted));
    if (filters?.docker_status) params.set('docker_status', filters.docker_status);
    const query = params.toString();
    return apiFetch<ServerListResponse>(`/servers/${query ? `?${query}` : ''}`);
  },
  
  get: (id: number) => apiFetch<Server>(`/servers/${id}/`),
  
  create: (data: Partial<Server>) => apiFetch<Server>('/servers/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: Partial<Server>) => apiFetch<Server>(`/servers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  patch: (id: number, data: Partial<Server>) => apiFetch<Server>(`/servers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  delete: (id: number) => apiFetch<void>(`/servers/${id}/`, { method: 'DELETE' }),
  
  test: (id: number) => apiFetch<{ status: string; message: string }>(`/servers/${id}/test/`, { method: 'POST' }),
  
  toggleActive: (id: number) => apiFetch<{ id: number; is_active: boolean }>(`/servers/${id}/toggle_active/`, { method: 'POST' }),
  
  toggleMaintenance: (id: number) => apiFetch<{ id: number; maintenance_mode: boolean }>(`/servers/${id}/toggle_maintenance/`, { method: 'POST' }),
  
  // ==========================================================================
  // NEW: Docker Actions (v0.1.12)
  // ==========================================================================
  
  /**
   * Perform Docker container action (start/stop/restart/delete)
   */
  dockerAction: (id: number, action: DockerAction, removeVolumes = false) => 
    apiFetch<DockerActionResponse>(`/servers/${id}/docker-action/`, {
      method: 'POST',
      body: JSON.stringify({ action, remove_volumes: removeVolumes }),
    }),
  
  /**
   * Get container logs
   */
  dockerLogs: (id: number, tail = 100, timestamps = true) =>
    apiFetch<DockerLogsResponse>(`/servers/${id}/logs/?tail=${tail}&timestamps=${timestamps}`),
  
  /**
   * Sync Docker status with actual container state
   */
  syncDockerStatus: (id: number) =>
    apiFetch<{ docker_status: DockerStatus; docker_status_display: string }>(`/servers/${id}/sync-status/`, {
      method: 'POST',
    }),
  
  /**
   * Check which Docker images are available
   */
  checkDockerImages: () =>
    apiFetch<DockerImagesStatus>('/servers/docker-images/'),
  
  /**
   * List all managed Docker containers
   */
  listDockerContainers: () =>
    apiFetch<DockerContainersResponse>('/servers/docker-containers/'),
  
  /**
   * Remove orphaned Docker containers
   */
  cleanupOrphanedContainers: () =>
    apiFetch<CleanupOrphanedResponse>('/servers/cleanup-orphaned/', {
      method: 'POST',
    }),
};

// =============================================================================
// CATEGORIES API
// =============================================================================

export const categoriesApi = {
  list: () => apiFetch<CategoryListResponse>('/categories/'),
  get: (id: number) => apiFetch<Category>(`/categories/${id}/`),
  create: (data: Partial<Category>) => apiFetch<Category>('/categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Category>) => apiFetch<Category>(`/categories/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiFetch<void>(`/categories/${id}/`, { method: 'DELETE' }),
};

// =============================================================================
// TESTS API
// =============================================================================

export const testsApi = {
  list: () => apiFetch<TestListResponse>('/stresstests/'),
  get: (id: number) => apiFetch<Test>(`/stresstests/${id}/`),
};

// =============================================================================
// EVENTS API
// =============================================================================

export const eventsApi = {
  list: (limit = 50) => apiFetch<EventListResponse>(`/events/?limit=${limit}`),
};

// =============================================================================
// CLIENTS API (legacy - for useApi hooks)
// =============================================================================

export const clientsApi = {
  list: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiFetch<ClientListResponse>(`/clients/${params}`);
  },
  get: (id: string) => apiFetch<SimplexClient>(`/clients/${id}/`),
};

// =============================================================================
// SIMPLEX CLIENTS API (full featured)
// =============================================================================

export const simplexClientsApi = {
  // CRUD
  list: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiFetch<ClientListResponse>(`/clients/${params}`);
  },
  
  get: (id: string) => apiFetch<SimplexClient>(`/clients/${id}/`),
  
  create: (data: Partial<SimplexClient>) => apiFetch<SimplexClient>('/clients/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: Partial<SimplexClient>) => apiFetch<SimplexClient>(`/clients/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: string) => apiFetch<void>(`/clients/${id}/`, { method: 'DELETE' }),
  
  // Container actions
  start: (id: string) => apiFetch<{ success: boolean; status: string; message: string }>(`/clients/${id}/start/`, { method: 'POST' }),
  
  stop: (id: string) => apiFetch<{ success: boolean; status: string; message: string }>(`/clients/${id}/stop/`, { method: 'POST' }),
  
  restart: (id: string) => apiFetch<{ success: boolean; status: string; message: string }>(`/clients/${id}/restart/`, { method: 'POST' }),
  
  logs: (id: string, tail = 50) => apiFetch<{ logs: string; status: string }>(`/clients/${id}/logs/?tail=${tail}`),
  
  connections: (id: string) => apiFetch<ClientConnection[]>(`/clients/${id}/connections/`),
  
  stats: () => apiFetch<ClientStats>('/clients/stats/'),
  
  // Latency endpoints
  latencyHistory: (id: string, params?: LatencyHistoryParams) => {
    const urlParams = new URLSearchParams();
    if (params?.page) urlParams.set('page', String(params.page));
    if (params?.page_size) urlParams.set('page_size', String(params.page_size));
    if (params?.sort) urlParams.set('sort', params.sort);
    if (params?.status) urlParams.set('status', params.status);
    if (params?.date_from) urlParams.set('date_from', params.date_from);
    if (params?.date_to) urlParams.set('date_to', params.date_to);
    const query = urlParams.toString();
    return apiFetch<LatencyHistoryResponse>(`/clients/${id}/latency-history/${query ? `?${query}` : ''}`);
  },
  
  latencyStats: (id: string, range: '24h' | '7d' | '30d' | 'all' = '24h') => 
    apiFetch<LatencyStats>(`/clients/${id}/latency-stats/?range=${range}`),
  
  latencyRecent: (id: string) => 
    apiFetch<RecentLatencyResponse>(`/clients/${id}/latency-recent/`),
  
  // Reset actions
  resetMessages: (id: string) => apiFetch<ResetResponse>(`/clients/${id}/reset-messages/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrfToken() },
  }),
  
  resetCounters: (id: string) => apiFetch<ResetResponse>(`/clients/${id}/reset-counters/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrfToken() },
  }),
  
  resetLatency: (id: string) => apiFetch<ResetResponse>(`/clients/${id}/reset-latency/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrfToken() },
  }),
  
  resetAll: (id: string) => apiFetch<ResetResponse>(`/clients/${id}/reset-all/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrfToken() },
  }),
};

// =============================================================================
// MESSAGES API
// =============================================================================

export const messagesApi = {
  list: (clientId?: string | number, direction?: 'sent' | 'received') => {
    let url = '/messages/';
    const params = new URLSearchParams();
    if (clientId) params.append('client', String(clientId));
    if (direction) params.append('direction', direction);
    if (params.toString()) url += '?' + params.toString();
    return apiFetch<{ results: TestMessage[] } | TestMessage[]>(url)
      .then(r => Array.isArray(r) ? r : r.results);
  },
  
  get: (id: string) => apiFetch<TestMessage>(`/messages/${id}/`),
  
  delete: (id: string) => apiFetch<{ success: boolean; message: string; deleted_id: string }>(`/messages/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': getCsrfToken() },
  }),
};

// =============================================================================
// DOCKER MANAGER API (v0.1.13 - Full Container Management)
// =============================================================================

const DOCKER_API_BASE = '/api/v1/docker';

export const dockerApi = {
  /**
   * Get Docker daemon information
   */
  info: () => apiFetch<DockerManagerInfo>(`${DOCKER_API_BASE}/info/`.replace(API_BASE, '')),

  /**
   * List all containers
   */
  list: (options?: {
    all?: boolean;
    status?: string;
    name?: string;
    sort?: string;
    order?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.all !== undefined) params.append('all', String(options.all));
    if (options?.status) params.append('status', options.status);
    if (options?.name) params.append('name', options.name);
    if (options?.sort) params.append('sort', options.sort);
    if (options?.order) params.append('order', options.order);
    const query = params.toString();
    return apiFetch<ContainerListResponse>(`${DOCKER_API_BASE}/containers/${query ? '?' + query : ''}`.replace(API_BASE, ''));
  },

  /**
   * Get container details
   */
  get: (containerId: string) => 
    apiFetch<DockerManagedContainer>(`${DOCKER_API_BASE}/containers/${containerId}/`.replace(API_BASE, '')),

  /**
   * Get container stats
   */
  stats: (containerId: string) => 
    apiFetch<ContainerStats>(`${DOCKER_API_BASE}/containers/${containerId}/stats/`.replace(API_BASE, '')),

  /**
   * Get stats for all running containers
   */
  allStats: () => 
    apiFetch<{ stats: ContainerStats[]; count: number }>(`${DOCKER_API_BASE}/containers/stats/`.replace(API_BASE, '')),

  /**
   * Get container logs
   */
  logs: (containerId: string, tail: number = 100) => 
    apiFetch<ContainerLogsResponse>(`${DOCKER_API_BASE}/containers/${containerId}/logs/?tail=${tail}`.replace(API_BASE, '')),

  /**
   * Execute container action (start, stop, restart, kill, pause, unpause)
   */
  action: (
    containerId: string, 
    action: 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause',
    options?: { timeout?: number; signal?: string }
  ) => apiFetch<ContainerActionResult>(`${DOCKER_API_BASE}/containers/${containerId}/${action}/`.replace(API_BASE, ''), {
    method: 'POST',
    body: JSON.stringify(options || {}),
  }),

  /**
   * Remove a container
   */
  remove: (containerId: string, force: boolean = false, volumes: boolean = false) => {
    const params = new URLSearchParams();
    if (force) params.append('force', 'true');
    if (volumes) params.append('volumes', 'true');
    return apiFetch<ContainerActionResult>(
      `${DOCKER_API_BASE}/containers/${containerId}/?${params.toString()}`.replace(API_BASE, ''),
      { method: 'DELETE' }
    );
  },

  /**
   * Prune stopped containers
   */
  prune: () => apiFetch<PruneResult>(`${DOCKER_API_BASE}/containers/prune/`.replace(API_BASE, ''), {
    method: 'POST',
  }),

  /**
   * Bulk action on multiple containers
   */
  bulk: (
    containerIds: string[], 
    action: 'start' | 'stop' | 'restart' | 'kill' | 'remove',
    force: boolean = false
  ) => apiFetch<BulkActionResult>(`${DOCKER_API_BASE}/containers/bulk/`.replace(API_BASE, ''), {
    method: 'POST',
    body: JSON.stringify({
      container_ids: containerIds,
      action,
      force,
    }),
  }),
};
