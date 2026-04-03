/**
 * Monitoring Utility
 * Tracks performance metrics and errors
 */

interface MetricData {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

interface ErrorData {
  timestamp: Date;
  error: string;
  service: string;
  userId?: string;
  context?: Record<string, any>;
}

class Monitor {
  private metrics: Map<string, MetricData[]> = new Map();
  private errors: ErrorData[] = [];
  private maxMetricsPerKey: number = 1000;
  private maxErrors: number = 10000;

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const data = this.metrics.get(name)!;
    data.push({
      timestamp: new Date(),
      value,
      labels,
    });

    // Keep only recent metrics
    if (data.length > this.maxMetricsPerKey) {
      data.shift();
    }
  }

  /**
   * Record an error
   */
  recordError(
    error: string,
    service: string,
    userId?: string,
    context?: Record<string, any>
  ): void {
    this.errors.push({
      timestamp: new Date(),
      error,
      service,
      userId,
      context,
    });

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const data = this.metrics.get(name);
    if (!data || data.length === 0) {
      return null;
    }

    const values = data.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    return {
      count: values.length,
      average,
      min,
      max,
      latest,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100): ErrorData[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get error count by service
   */
  getErrorCountByService(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const error of this.errors) {
      counts[error.service] = (counts[error.service] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, MetricData[]> {
    const result: Record<string, MetricData[]> = {};
    for (const [key, value] of this.metrics) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Clear old data
   */
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour

    // Clean up old metrics
    for (const [key, data] of this.metrics) {
      const filtered = data.filter(
        (d) => d.timestamp.getTime() > oneHourAgo
      );
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }

    // Clean up old errors
    this.errors = this.errors.filter(
      (e) => e.timestamp.getTime() > oneHourAgo
    );
  }
}

export const monitor = new Monitor();

/**
 * Performance Timer
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    monitor.recordMetric(`${this.name}_duration_ms`, duration);
    return duration;
  }
}

