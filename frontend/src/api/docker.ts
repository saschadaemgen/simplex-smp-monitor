/**
 * Docker API Client
 */

// ============================================
// DOCKER TYPES
// ============================================

export interface DockerInfo {
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

export interface DockerContainer {
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
  containers: DockerContainer[];
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

// ============================================
// DOCKER API FUNCTIONS
// ============================================

const DOCKER_API_BASE = '/api/v1/docker';

export const dockerApi = {
  /**
   * Get Docker daemon information
   */
  async info(): Promise<DockerInfo> {
    const response = await fetch(`${DOCKER_API_BASE}/info/`);
    if (!response.ok) throw new Error('Failed to fetch Docker info');
    return response.json();
  },

  /**
   * List all containers
   */
  async list(options?: {
    all?: boolean;
    status?: string;
    name?: string;
    sort?: string;
    order?: string;
  }): Promise<ContainerListResponse> {
    const params = new URLSearchParams();
    if (options?.all !== undefined) params.append('all', String(options.all));
    if (options?.status) params.append('status', options.status);
    if (options?.name) params.append('name', options.name);
    if (options?.sort) params.append('sort', options.sort);
    if (options?.order) params.append('order', options.order);

    const url = `${DOCKER_API_BASE}/containers/${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch containers');
    return response.json();
  },

  /**
   * Get container details
   */
  async get(containerId: string): Promise<DockerContainer> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/${containerId}/`);
    if (!response.ok) throw new Error('Container not found');
    return response.json();
  },

  /**
   * Get container stats
   */
  async stats(containerId: string): Promise<ContainerStats> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/${containerId}/stats/`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  /**
   * Get stats for all running containers
   */
  async allStats(): Promise<{ stats: ContainerStats[]; count: number }> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/stats/`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  /**
   * Get container logs
   */
  async logs(containerId: string, tail: number = 100): Promise<ContainerLogsResponse> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/${containerId}/logs/?tail=${tail}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  },

  /**
   * Execute container action (start, stop, restart, kill, pause, unpause)
   */
  async action(
    containerId: string, 
    action: 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause',
    options?: { timeout?: number; signal?: string }
  ): Promise<ContainerActionResult> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/${containerId}/${action}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {}),
    });
    return response.json();
  },

  /**
   * Remove a container
   */
  async remove(containerId: string, force: boolean = false, volumes: boolean = false): Promise<ContainerActionResult> {
    const params = new URLSearchParams();
    if (force) params.append('force', 'true');
    if (volumes) params.append('volumes', 'true');

    const response = await fetch(
      `${DOCKER_API_BASE}/containers/${containerId}/?${params.toString()}`,
      { method: 'DELETE' }
    );
    return response.json();
  },

  /**
   * Prune stopped containers
   */
  async prune(): Promise<PruneResult> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/prune/`, {
      method: 'POST',
    });
    return response.json();
  },

  /**
   * Bulk action on multiple containers
   */
  async bulk(
    containerIds: string[], 
    action: 'start' | 'stop' | 'restart' | 'kill' | 'remove',
    force: boolean = false
  ): Promise<BulkActionResult> {
    const response = await fetch(`${DOCKER_API_BASE}/containers/bulk/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        container_ids: containerIds,
        action,
        force,
      }),
    });
    return response.json();
  },
};
