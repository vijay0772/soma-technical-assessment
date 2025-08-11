"use client"
import { useState, useEffect } from 'react';

type Todo = {
  id: number;
  title: string;
  dueDate: string | null;
  imageUrl: string | null;
  imageId: string | null;
  createdAt: string;
  earliestStart: string | null;
  isCritical: boolean;
  dependencies: Todo[];
  dependents: Todo[];
};

interface DependencyModalProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onAddDependencies: (todoId: number, dependencyIds: number[]) => Promise<void>;
  onRemoveDependencies: (todoId: number, dependencyIds: number[]) => Promise<void>;
}

export default function DependencyModal({
  todo,
  isOpen,
  onClose,
  onAddDependencies,
  onRemoveDependencies
}: DependencyModalProps) {
  const [availableTodos, setAvailableTodos] = useState<Todo[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && todo) {
      fetchAvailableTodos();
      setSelectedDependencies(todo.dependencies ? todo.dependencies.map(d => d.id) : []);
    }
  }, [isOpen, todo]);

  const fetchAvailableTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const todos = await res.json();
        // Filter out the current todo and its current dependencies
        const available = todos.filter((t: Todo) => t.id !== todo?.id);
        setAvailableTodos(available);
      }
    } catch (error) {
      console.error('Failed to fetch available todos:', error);
    }
  };

  const handleSave = async () => {
    if (!todo) return;

    setIsLoading(true);
    try {
      // Get current dependencies
      const currentDependencyIds = todo.dependencies ? todo.dependencies.map(d => d.id) : [];
      
      // Find dependencies to add
      const toAdd = selectedDependencies.filter(id => !currentDependencyIds.includes(id));
      
      // Find dependencies to remove
      const toRemove = currentDependencyIds.filter(id => !selectedDependencies.includes(id));

      // Add new dependencies
      if (toAdd.length > 0) {
        await onAddDependencies(todo.id, toAdd);
      }

      // Remove dependencies
      if (toRemove.length > 0) {
        await onRemoveDependencies(todo.id, toRemove);
      }

      onClose();
    } catch (error) {
      console.error('Error updating dependencies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDependencyToggle = (todoId: number) => {
    setSelectedDependencies(prev => 
      prev.includes(todoId)
        ? prev.filter(id => id !== todoId)
        : [...prev, todoId]
    );
  };

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">
              Manage Dependencies for: {todo.title}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Current Dependencies:</h3>
            {todo.dependencies && todo.dependencies.length > 0 ? (
              <div className="space-y-2">
                {todo.dependencies.map(dep => (
                  <div key={dep.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-blue-800">{dep.title}</span>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Current
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No dependencies set</p>
            )}
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Available Todos:</h3>
            <div className="space-y-2">
              {availableTodos.map(availableTodo => (
                <label key={availableTodo.id} className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={selectedDependencies.includes(availableTodo.id)}
                    onChange={() => handleDependencyToggle(availableTodo.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-800">{availableTodo.title}</span>
                    {availableTodo.dueDate && (
                      <span className="text-xs text-slate-500 ml-2">
                        Due: {new Date(availableTodo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium">Dependency Rules:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• A todo cannot depend on itself</li>
                  <li>• Circular dependencies are not allowed</li>
                  <li>• Dependencies affect the earliest start date</li>
                  <li>• Critical path is automatically calculated</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 