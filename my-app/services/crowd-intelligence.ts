/**
 * Crowd Intelligence API client for hazard verification
 */

export interface HazardLocation {
  lat: number;
  lon: number;
}

export interface CrowdIntelligence {
  confirmations: number;
  denials: number;
  total_feedback: number;
  confidence_score: number;
  verified_by_count: number;
}

export interface Hazard {
  hazard_id: string;
  class_name: string;
  initial_confidence: number;
  location: HazardLocation;
  bbox: [number, number, number, number];
  detection_timestamp: number;
  status: 'unverified' | 'verified' | 'disputed' | 'resolved' | 'expired';
  crowd_intelligence: CrowdIntelligence;
  last_updated: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expires_at?: number;
}

export interface FeedbackRequest {
  user_id: string;
  feedback_type: 'confirm' | 'deny' | 'update' | 'resolve';
  latitude?: number;
  longitude?: number;
  confidence?: number;
  comment?: string;
}

export interface UserContribution {
  user_id: string;
  total_feedback: number;
  reputation_score: number;
  hazards_contributed: string[];
}

export interface CrowdStats {
  total_hazards: number;
  verified_hazards: number;
  resolved_hazards: number;
  disputed_hazards: number;
  total_feedback: number;
  unique_contributors: number;
  active_hazards: number;
  verification_threshold: number;
  denial_threshold: number;
}

export class CrowdIntelligenceClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  }

  /**
   * Report a new hazard detection
   */
  async reportHazard(
    className: string,
    confidence: number,
    latitude: number,
    longitude: number,
    bbox: [number, number, number, number],
    userId?: string
  ): Promise<Hazard> {
    const response = await fetch(`${this.baseUrl}/hazards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        class_name: className,
        confidence,
        latitude,
        longitude,
        bbox,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to report hazard: ${response.statusText}`);
    }

    const data = await response.json();
    return data.hazard;
  }

  /**
   * Get hazards near a location
   */
  async getNearbyHazards(
    latitude: number,
    longitude: number,
    radius: number = 500,
    includeResolved: boolean = false
  ): Promise<Hazard[]> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      include_resolved: includeResolved.toString(),
    });

    const response = await fetch(`${this.baseUrl}/hazards/nearby?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to get nearby hazards: ${response.statusText}`);
    }

    const data = await response.json();
    return data.hazards;
  }

  /**
   * Get details of a specific hazard
   */
  async getHazardDetails(hazardId: string): Promise<Hazard> {
    const response = await fetch(`${this.baseUrl}/hazards/${hazardId}`);

    if (!response.ok) {
      throw new Error(`Failed to get hazard details: ${response.statusText}`);
    }

    const data = await response.json();
    return data.hazard;
  }

  /**
   * Submit feedback for a hazard
   */
  async submitFeedback(
    hazardId: string,
    feedback: FeedbackRequest
  ): Promise<Hazard> {
    const response = await fetch(`${this.baseUrl}/hazards/${hazardId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to submit feedback: ${response.statusText}`);
    }

    const data = await response.json();
    return data.hazard;
  }

  /**
   * Confirm a hazard exists
   */
  async confirmHazard(
    hazardId: string,
    userId: string,
    location?: { latitude: number; longitude: number },
    comment?: string
  ): Promise<Hazard> {
    return this.submitFeedback(hazardId, {
      user_id: userId,
      feedback_type: 'confirm',
      latitude: location?.latitude,
      longitude: location?.longitude,
      confidence: 1.0,
      comment,
    });
  }

  /**
   * Deny a hazard exists
   */
  async denyHazard(
    hazardId: string,
    userId: string,
    location?: { latitude: number; longitude: number },
    comment?: string
  ): Promise<Hazard> {
    return this.submitFeedback(hazardId, {
      user_id: userId,
      feedback_type: 'deny',
      latitude: location?.latitude,
      longitude: location?.longitude,
      confidence: 1.0,
      comment,
    });
  }

  /**
   * Mark a hazard as resolved
   */
  async resolveHazard(
    hazardId: string,
    userId: string,
    location?: { latitude: number; longitude: number },
    comment?: string
  ): Promise<Hazard> {
    return this.submitFeedback(hazardId, {
      user_id: userId,
      feedback_type: 'resolve',
      latitude: location?.latitude,
      longitude: location?.longitude,
      confidence: 1.0,
      comment,
    });
  }

  /**
   * Get crowd intelligence statistics
   */
  async getStats(): Promise<CrowdStats> {
    const response = await fetch(`${this.baseUrl}/crowd/stats`);

    if (!response.ok) {
      throw new Error(`Failed to get crowd stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data.stats;
  }

  /**
   * Get user's contribution statistics
   */
  async getUserContribution(userId: string): Promise<UserContribution> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/contribution`);

    if (!response.ok) {
      throw new Error(`Failed to get user contribution: ${response.statusText}`);
    }

    const data = await response.json();
    return data.contribution;
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(status: Hazard['status']): string {
  switch (status) {
    case 'verified':
      return '#4CAF50'; // Green
    case 'unverified':
      return '#FFC107'; // Amber
    case 'disputed':
      return '#FF9800'; // Orange
    case 'resolved':
      return '#9E9E9E'; // Gray
    case 'expired':
      return '#757575'; // Dark Gray
    default:
      return '#2196F3'; // Blue
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: Hazard['severity']): string {
  switch (severity) {
    case 'critical':
      return '#F44336'; // Red
    case 'high':
      return '#FF5722'; // Deep Orange
    case 'medium':
      return '#FF9800'; // Orange
    case 'low':
      return '#FFC107'; // Amber
    default:
      return '#9E9E9E'; // Gray
  }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get time ago string
 */
export function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}
