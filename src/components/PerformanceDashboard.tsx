import { useState, useEffect } from 'react';
import { PerformanceMonitor } from '@/lib/performance';

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Record<string, { avg: number; min: number; max: number; count: number }>>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(PerformanceMonitor.getMetrics());
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Show Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => PerformanceMonitor.clearMetrics()}
            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
          >
            ×
          </button>
        </div>
      </div>

      {Object.keys(metrics).length === 0 ? (
        <p className="text-gray-500 text-sm">No performance data available</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(metrics).map(([label, data]) => (
            <div key={label} className="border border-gray-200 rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm text-gray-900">{label}</span>
                <span className="text-xs text-gray-500">{data.count} calls</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Avg:</span>
                  <span className="ml-1 font-medium">{data.avg.toFixed(2)}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">Min:</span>
                  <span className="ml-1 font-medium">{data.min.toFixed(2)}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">Max:</span>
                  <span className="ml-1 font-medium">{data.max.toFixed(2)}ms</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min((data.avg / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => PerformanceMonitor.logMetrics()}
          className="w-full text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200"
        >
          Log to Console
        </button>
      </div>
    </div>
  );
} 