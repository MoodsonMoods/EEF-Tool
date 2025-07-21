'use client';

import { useScenarios } from '@/lib/store';
import { SquadScenario } from '@/types';

interface ScenarioListProps {
  onLoadScenario?: (scenario: SquadScenario) => void;
}

export default function ScenarioList({ onLoadScenario }: ScenarioListProps) {
  const { scenarios, deleteScenario, exportScenario } = useScenarios();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      deleteScenario(id);
    }
  };

  const handleExport = (id: string) => {
    const scenarioJson = exportScenario(id);
    const blob = new Blob([scenarioJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (scenarios.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Saved Scenarios</h2>
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No saved scenarios yet.</p>
          <p className="text-sm">Create and save your first squad scenario to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Saved Scenarios</h2>
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                {scenario.description && (
                  <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Formation: {scenario.formation.def}-{scenario.formation.mid}-{scenario.formation.fwd}</span>
                  <span>Budget: £{scenario.budget.toFixed(1)}</span>
                  <span>Players: {scenario.startingXI.length + scenario.bench.length}/15</span>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(scenario.updatedAt).toLocaleDateString()}
              </div>
            </div>
            
            <div className="flex space-x-2">
              {onLoadScenario && (
                <button
                  onClick={() => onLoadScenario(scenario)}
                  className="text-xs bg-primary-100 text-primary-800 px-3 py-1 rounded hover:bg-primary-200 transition-colors"
                >
                  Load
                </button>
              )}
              <button
                onClick={() => handleExport(scenario.id)}
                className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition-colors"
              >
                Export
              </button>
              <button
                onClick={() => handleDelete(scenario.id)}
                className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 