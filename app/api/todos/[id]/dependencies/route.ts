import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

// Helper function to detect circular dependencies using DFS
async function hasCircularDependencies(todoId: number, newDependencyId: number): Promise<boolean> {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  async function dfs(currentId: number): Promise<boolean> {
    if (recursionStack.has(currentId)) {
      return true; // Found a cycle
    }
    
    if (visited.has(currentId)) {
      return false; // Already processed
    }
    
    visited.add(currentId);
    recursionStack.add(currentId);
    
    // Get all dependencies of the current todo
    const todo = await prisma.todo.findUnique({
      where: { id: currentId },
      include: { dependencies: true }
    });
    
    if (!todo) return false;
    
    // Check if any dependency would create a cycle
    for (const dependency of todo.dependencies) {
      if (dependency.id === newDependencyId || await dfs(dependency.id)) {
        return true;
      }
    }
    
    recursionStack.delete(currentId);
    return false;
  }
  
  return await dfs(newDependencyId);
}

// Helper function to calculate earliest start date
async function calculateEarliestStart(todoId: number): Promise<Date | null> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { dependencies: true }
  });
  
  if (!todo || todo.dependencies.length === 0) {
    return todo?.createdAt || null;
  }
  
  const dependencyDates = await Promise.all(
    todo.dependencies.map(async (dep: any) => {
      const depEarliestStart = await calculateEarliestStart(dep.id);
      return depEarliestStart || dep.dueDate || dep.createdAt;
    })
  );
  
  const maxDate = new Date(Math.max(...dependencyDates.map(d => d.getTime())));
  return maxDate;
}

// Helper function to identify critical path
async function updateCriticalPathStatus(): Promise<void> {
  const todos = await prisma.todo.findMany({
    include: { dependencies: true, dependents: true }
  });
  
  // Reset all critical status
  await prisma.todo.updateMany({
    data: { isCritical: false }
  });
  
  // Find todos with no dependents (end nodes)
  const endNodes = todos.filter((todo: any) => todo.dependents.length === 0);
  
  // Mark critical path by working backwards from end nodes
  for (const endNode of endNodes) {
    await markCriticalPath(endNode.id);
  }
}

async function markCriticalPath(todoId: number): Promise<void> {
  await prisma.todo.update({
    where: { id: todoId },
    data: { isCritical: true }
  });
  
  // Get dependencies and mark the one with latest completion
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { dependencies: true }
  });
  
  if (todo && todo.dependencies.length > 0) {
    let latestDependency = todo.dependencies[0];
    let latestDate = latestDependency.dueDate || latestDependency.createdAt;
    
    for (const dep of todo.dependencies) {
      const depDate = dep.dueDate || dep.createdAt;
      if (depDate > latestDate) {
        latestDependency = dep;
        latestDate = depDate;
      }
    }
    
    await markCriticalPath(latestDependency.id);
  }
}

// GET: Get dependencies for a todo
export async function GET(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const todo = await prisma.todo.findUnique({
      where: { id },
      include: {
        dependencies: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            earliestStart: true,
            isCritical: true
          }
        },
        dependents: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            earliestStart: true,
            isCritical: true
          }
        }
      }
    });

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({
      dependencies: todo.dependencies,
      dependents: todo.dependents
    });
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return NextResponse.json({ error: 'Error fetching dependencies' }, { status: 500 });
  }
}

// POST: Add dependencies to a todo
export async function POST(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const { dependencyIds } = await request.json();
    
    if (!Array.isArray(dependencyIds)) {
      return NextResponse.json({ error: 'dependencyIds must be an array' }, { status: 400 });
    }

    // Check if the todo exists
    const todo = await prisma.todo.findUnique({
      where: { id }
    });

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Check for circular dependencies
    for (const depId of dependencyIds) {
      if (depId === id) {
        return NextResponse.json({ error: 'Cannot add self as dependency' }, { status: 400 });
      }
      
      if (await hasCircularDependencies(id, depId)) {
        return NextResponse.json({ 
          error: `Adding dependency ${depId} would create a circular dependency` 
        }, { status: 400 });
      }
    }

    // Add dependencies
    await prisma.todo.update({
      where: { id },
      data: {
        dependencies: {
          connect: dependencyIds.map((depId: number) => ({ id: depId }))
        }
      }
    });

    // Recalculate earliest start dates and critical path
    const newEarliestStart = await calculateEarliestStart(id);
    await prisma.todo.update({
      where: { id },
      data: { earliestStart: newEarliestStart }
    });
    await updateCriticalPathStatus();

    return NextResponse.json({ message: 'Dependencies added successfully' });
  } catch (error) {
    console.error('Error adding dependencies:', error);
    return NextResponse.json({ error: 'Error adding dependencies' }, { status: 500 });
  }
}

// DELETE: Remove dependencies from a todo
export async function DELETE(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const { dependencyIds } = await request.json();
    
    if (!Array.isArray(dependencyIds)) {
      return NextResponse.json({ error: 'dependencyIds must be an array' }, { status: 400 });
    }

    // Remove dependencies
    await prisma.todo.update({
      where: { id },
      data: {
        dependencies: {
          disconnect: dependencyIds.map((depId: number) => ({ id: depId }))
        }
      }
    });

    // Recalculate earliest start dates and critical path
    const newEarliestStart = await calculateEarliestStart(id);
    await prisma.todo.update({
      where: { id },
      data: { earliestStart: newEarliestStart }
    });
    await updateCriticalPathStatus();

    return NextResponse.json({ message: 'Dependencies removed successfully' });
  } catch (error) {
    console.error('Error removing dependencies:', error);
    return NextResponse.json({ error: 'Error removing dependencies' }, { status: 500 });
  }
} 