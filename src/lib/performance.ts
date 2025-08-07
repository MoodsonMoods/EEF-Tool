import React from 'react';

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  private static enabled = process.env.NODE_ENV === 'development';

  static startTimer(label: string): () => void {
    if (!this.enabled) return () => {};
    
    const start = performance.now();
    return () => this.endTimer(label, start);
  }

  private static endTimer(label: string, start: number): void {
    const duration = performance.now() - start;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    this.metrics.get(label)!.push(duration);
    
    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    
    const endTimer = this.startTimer(label);
    return fn().finally(endTimer);
  }

  static getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((durations, label) => {
      const avg = durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      result[label] = { avg, min, max, count: durations.length };
    });
    
    return result;
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }

  static logMetrics(): void {
    if (!this.enabled) return;
    
    const metrics = this.getMetrics();
    console.table(metrics);
  }
}

// React Performance Hooks
export const usePerformanceMonitor = (label: string) => {
  const startTimer = PerformanceMonitor.startTimer(label);
  
  return {
    endTimer: startTimer,
    measureAsync: <T>(fn: () => Promise<T>) => PerformanceMonitor.measureAsync(label, fn)
  };
};

// Component Performance Wrapper
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  label: string
): React.ComponentType<P> => {
  return (props: P) => {
    const { endTimer } = usePerformanceMonitor(label);
    
    React.useEffect(() => {
      return endTimer;
    }, [endTimer]);
    
    return React.createElement(Component, props);
  };
}; 