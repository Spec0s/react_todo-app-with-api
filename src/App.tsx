/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useCallback, useEffect, useState } from 'react';
import { UserWarning } from './UserWarning';
import {
  addTodo, deleteTodo, getTodos, updateTodo,
} from './api/todos';
import { Todo } from './types/Todo';
import { TodoList } from './components/TodoList';
import { TodoItem } from './components/TodoItem';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Error } from './components/Error';

const USER_ID = 11616;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [errorWarning, setErrorWarning] = useState('');
  const [pageIsLoaded, setPageIsLoaded] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(0);
  const [editQuery, setEditQuery] = useState('');
  const [editQueryPrev, setEditQueryPrev] = useState('');

  const input = document
    .querySelector<HTMLInputElement>('.todoapp__new-todo');

  const handleErrorSet = (errMessage: string) => {
    setErrorWarning(errMessage);
    setTimeout(() => {
      setErrorWarning('');
    }, 3000);
  };

  const closeError = () => {
    setErrorWarning('');
  };

  const loadTodos = async () => {
    try {
      const loadedTodos = await getTodos(USER_ID);

      setTodos(loadedTodos);
      setPageIsLoaded(true);
    } catch {
      handleErrorSet('load-todo');
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  useEffect(() => {
    input?.focus();
  }, [input, pageIsLoaded, todos]);

  const visibleTodos = (filterBy: string) => {
    if (todos) {
      switch (filterBy) {
        case 'all':
          return todos;
        case 'active':
          return todos.filter(todo => (
            !todo.completed
          ));
        case 'completed':
          return todos.filter(todo => (
            todo.completed
          ));
        default: return todos;
      }
    }

    return todos;
  };

  const handleFormSubmit = async () => {
    if (query.trim().length < 1) {
      handleErrorSet('title-empty');

      return;
    }

    const newTodo = {
      id: todos.length > 0 ? todos[todos.length - 1].id + 1 : 1,
      userId: USER_ID,
      title: query.trim(),
      completed: false,
    };

    setTempTodo({ ...newTodo, id: 0 });

    try {
      setPageIsLoaded(false);
      await addTodo('/todos', newTodo)
        .then(() => {
          setTodos((state) => {
            return [...state, newTodo];
          });
          setTempTodo(null);
          setPageIsLoaded(true);
        });
      setQuery('');
    } catch {
      handleErrorSet('add-todo');
      setTempTodo(null);
      setPageIsLoaded(true);
    }
  };

  const handleComplete = async (id: number, completed: boolean) => {
    try {
      setIsUpdatingId(state => (
        [...state, id]
      ));
      await updateTodo(id, { completed: !completed })
        .then(() => {
          todos.map(todo => {
            if (todo.id === id) {
              // eslint-disable-next-line no-param-reassign
              todo.completed = !completed;
            }

            return todo;
          });
        });
      setIsUpdatingId((state) => (
        [...state.filter(stateId => stateId !== id)]
      ));
    } catch {
      handleErrorSet('update-todo');
      setIsUpdatingId((state) => (
        [...state.filter(stateId => stateId !== id)]
      ));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setIsUpdatingId(state => (
        [...state, id]
      ));
      await deleteTodo(id)
        .then(() => setTodos((state) => {
          return [...state.filter(todo => todo.id !== id)];
        }));
      setIsUpdatingId((state) => (
        [...state.filter(stateId => stateId !== id)]
      ));
    } catch {
      handleErrorSet('delete-todo');
      setIsUpdatingId((state) => (
        [...state.filter(stateId => stateId !== id)]
      ));
    }
  };

  const handleMultipleDelete = () => {
    todos.forEach(async (todo) => {
      try {
        if (todo.completed === true) {
          setIsUpdatingId(state => (
            [...state, todo.id]
          ));
          await deleteTodo(todo.id)
            .then(() => setTodos((state) => {
              return [...state.filter(todoF => todoF.id !== todo.id)];
            }));
          setIsUpdatingId((state) => (
            [...state.filter(stateId => stateId !== todo.id)]
          ));
        }
      } catch {
        handleErrorSet('delete-todo');
        setIsUpdatingId([]);
      }
    });
  };

  const completedTodos = useCallback(() => {
    return todos.filter(todo => todo.completed).length;
  }, [todos]);

  const uncompletedTodos = useCallback(() => {
    return todos.filter(todo => !todo.completed).length;
  }, [todos]);

  const toggleAll = () => {
    const isStatus = todos.every(todo => todo.completed === true);

    todos.map(async (todo) => {
      try {
        setIsUpdatingId(state => (
          [...state, todo.id]
        ));
        if (isStatus && todo.completed) {
          await updateTodo(todo.id, { completed: false })
            .then(() => {
              // eslint-disable-next-line no-param-reassign
              todo.completed = false;
              setIsUpdatingId([]);
            });
        } else if (!todo.completed) {
          await updateTodo(todo.id, { completed: true })
            .then(() => {
              // eslint-disable-next-line no-param-reassign
              todo.completed = true;
              setIsUpdatingId([]);
            });
        }

        return todos;
      } catch {
        handleErrorSet('update-todo');
        setIsUpdatingId([]);

        return todos;
      }
    });
  };

  const ecsKeyCancel = (e: string) => {
    if (e === 'Escape') {
      setEditQuery(editQueryPrev);
      setIsEditing(0);
    }
  };

  const handleEdit = (id: number, title: string) => {
    document.addEventListener('keyup', event => {
      ecsKeyCancel(event.key);
    });

    setIsEditing(id);
    setEditQuery(title);
    setEditQueryPrev(title);
  };

  const handleEditSubmit = async (queryEdit: string, id: number) => {
    try {
      if (!queryEdit.trim()) {
        handleDelete(id);

        return;
      }

      if (editQueryPrev === queryEdit.trim()) {
        setIsEditing(0);

        return;
      }

      setIsUpdatingId(state => (
        [...state, id]
      ));
      await updateTodo(id, { title: queryEdit.trim() })
        .then(() => {
          todos.map(todo => {
            if (todo.id === id) {
              // eslint-disable-next-line no-param-reassign
              todo.title = queryEdit.trim();
            }

            return todo;
          });
        });
      setIsUpdatingId((state) => (
        [...state.filter(stateId => stateId !== id)]
      ));
      setIsEditing(0);
    } catch {
      handleErrorSet('update-todo');
      setIsUpdatingId((state) => (
        [...state.filter(stateId => stateId !== id)]
      ));
    }
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          todosLength={todos.length}
          handleFormSubmit={handleFormSubmit}
          query={query}
          setQuery={setQuery}
          uncompletedTodos={uncompletedTodos()}
          toggleAll={toggleAll}
          pageIsLoaded={pageIsLoaded}
        />
        {todos && (
          <TodoList
            todos={visibleTodos(filter)}
            handleComplete={handleComplete}
            handleDelete={handleDelete}
            isUpdatingId={isUpdatingId}
            isEditing={isEditing}
            handleEdit={handleEdit}
            query={editQuery}
            setQuery={setEditQuery}
            handleEditSubmit={handleEditSubmit}
          />
        )}
        {tempTodo && (
          <TodoItem tempTodos={tempTodo} />
        )}

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <Footer
            filter={setFilter}
            filterValue={filter}
            completedTodos={completedTodos()}
            uncompletedTodos={uncompletedTodos()}
            handleMultipleDelete={handleMultipleDelete}
          />
        )}
      </div>
      <Error error={errorWarning} closeError={closeError} />
    </div>
  );
};
