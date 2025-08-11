"use client"
import { useState, useEffect } from 'react';
import DependencyModal from './components/DependencyModal';

// Define Todo type locally to avoid import issues
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

export default function Home() {
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTodoForDependencies, setSelectedTodoForDependencies] = useState<Todo | null>(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setError(null);
      const res = await fetch('/api/todos');
      if (!res.ok) {
        throw new Error(`Failed to fetch todos: ${res.status}`);
      }
      const data = await res.json();
      console.log('Fetched todos:', data);
      // Ensure data is always an array
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      setError('Failed to load todos. Please try again.');
      setTodos([]); // Set empty array on error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTodo.trim(),
          dueDate: dueDate || null,
        }),
      });

      if (res.ok) {
        const newTodoItem = await res.json();
        setTodos([newTodoItem, ...todos]);
        setNewTodo('');
        setDueDate('');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create todo');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      setError(error instanceof Error ? error.message : 'Failed to create todo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTodos(todos.filter(todo => todo.id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      setError('Failed to delete todo');
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const handleAddDependencies = async (todoId: number, dependencyIds: number[]) => {
    try {
      const res = await fetch(`/api/todos/${todoId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dependencyIds }),
      });

      if (res.ok) {
        await fetchTodos(); // Refresh todos to get updated dependency info
        setShowDependencyModal(false);
        setSelectedTodoForDependencies(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add dependencies');
      }
    } catch (error) {
      console.error('Error adding dependencies:', error);
      setError(error instanceof Error ? error.message : 'Failed to add dependencies');
    }
  };

  const handleRemoveDependencies = async (todoId: number, dependencyIds: number[]) => {
    try {
      const res = await fetch(`/api/todos/${todoId}/dependencies`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dependencyIds }),
      });

      if (res.ok) {
        await fetchTodos(); // Refresh todos to get updated dependency info
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove dependencies');
      }
    } catch (error) {
      console.error('Error removing dependencies:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove dependencies');
    }
  };

  const openDependencyModal = (todo: Todo) => {
    setSelectedTodoForDependencies(todo);
    setShowDependencyModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Professional Todo App
            </h1>
            <p className="text-lg text-slate-600">
              Organize your tasks with due dates and automatic image visualization
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Add Todo Form */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800 placeholder-slate-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !newTodo.trim()}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Add Todo'
                )}
              </button>
            </form>
          </div>

          {/* Todo List */}
          <div className="space-y-4">
            {Array.isArray(todos) && todos.length > 0 ? (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Todo Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-semibold text-slate-800 pr-4">
                          {todo.title}
                        </h3>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors duration-200 p-1 hover:bg-red-50 rounded-full"
                          title="Delete todo"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      {todo.dueDate && (
                        <div className="mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            isOverdue(todo.dueDate)
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Due: {new Date(todo.dueDate).toLocaleDateString()}
                            {isOverdue(todo.dueDate) && (
                              <span className="ml-2 text-red-600 font-semibold">(Overdue)</span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm text-slate-500">
                        Created: {new Date(todo.createdAt).toLocaleDateString()}
                      </p>
                      
                      {/* Dependency Information */}
                      <div className="mt-3 space-y-2">
                        {todo.earliestStart && (
                          <div className="text-sm">
                            <span className="text-slate-600 font-medium">Earliest Start:</span>{' '}
                            <span className="text-slate-700">{new Date(todo.earliestStart).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {todo.isCritical && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            🚨 Critical Path
                          </span>
                        )}
                        
                        {todo.dependencies && todo.dependencies.length > 0 && (
                          <div className="text-sm">
                            <span className="text-slate-600 font-medium">Depends on:</span>{' '}
                            <span className="text-slate-700">{todo.dependencies.map(d => d.title).join(', ')}</span>
                          </div>
                        )}
                        
                        {todo.dependents && todo.dependents.length > 0 && (
                          <div className="text-sm">
                            <span className="text-slate-600 font-medium">Required by:</span>{' '}
                            <span className="text-slate-700">{todo.dependents.map(d => d.title).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Dependency Management Button */}
                      <div className="mt-3">
                        <button
                          onClick={() => openDependencyModal(todo)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Manage Dependencies
                        </button>
                      </div>
                    </div>

                    {/* Image Display */}
                    {todo.imageUrl && (
                      <div className="lg:w-48 lg:flex-shrink-0">
                        <div className="relative">
                          <img
                            src={todo.imageUrl}
                            alt={`Visualization for: ${todo.title}`}
                            className="w-full h-32 object-cover rounded-lg shadow-md"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                            📸 Pexels
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-600 mb-2">No todos yet</h3>
                <p className="text-slate-500">Create your first todo to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dependency Modal */}
      <DependencyModal
        todo={selectedTodoForDependencies}
        isOpen={showDependencyModal}
        onClose={() => {
          setShowDependencyModal(false);
          setSelectedTodoForDependencies(null);
        }}
        onAddDependencies={handleAddDependencies}
        onRemoveDependencies={handleRemoveDependencies}
      />
    </div>
  );
}
