"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  // --- State ---
  const [taskText, setTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  
  // --- Поиск и сортировка ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  
  // --- Редактирование ---
  const [editingTask, setEditingTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    priority: "medium",
    due_at: "",
    description: ""
  });

  // --- Toasts (уведомления) ---
  const [toasts, setToasts] = useState([]);

  // --- Загрузка задач ---
  async function loadTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  // --- Toasts: показать уведомление ---
  function showToast(message, type = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }

  // --- Быстрое добавление (Enter) ---
  async function handleQuickAdd(title) {
    const { error } = await supabase
      .from("tasks")
      .insert([{ 
        title: title.trim(), 
        priority: "medium", 
        done: false 
      }]);

    if (error) {
      console.error("Ошибка быстрого добавления:", error);
      showToast(`Ошибка: ${error.message}`, 'error');
      return;
    }
    loadTasks();
    showToast("✅ Задача добавлена", 'success');
  }

  // --- Добавление задачи ---
  async function handleAdd(e) {
    e.preventDefault();
    const text = taskText.trim();
    if (!text) {
      showToast("Введите название задачи!", 'error');
      return;
    }

  let dueAt = null;
  if (taskDue) {
    // Если в строке нет 'T' (время), добавляем 'T00:00:00' (начало дня)
    const dateTimeStr = taskDue.includes('T') ? taskDue : `${taskDue}T00:00:00`;
    const date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) {
      dueAt = date.toISOString();
    }
  }

    const { error } = await supabase
      .from("tasks")
      .insert([{ 
        title: text, 
        priority: taskPriority, 
        due_at: dueAt, 
        description: taskDescription.trim(),
        done: false 
      }]);

    if (error) {
      console.error("Ошибка добавления:", error);
      showToast(`Ошибка: ${error.message}`, 'error');
      return;
    }

    // Очистка формы
    setTaskText("");
    setTaskPriority("medium");
    setTaskDue("");
    setTaskDescription("");
    loadTasks();
    showToast("✅ Задача добавлена", 'success');
  }

  // --- Удаление ---
  async function handleDelete(id) {
    if (!confirm("Удалить эту задачу?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Ошибка удаления:", error);
      showToast(`Ошибка: ${error.message}`, 'error');
      return;
    }
    loadTasks();
    showToast("✅ Задача удалена", 'success');
  }

  // --- Отметка выполнено ---
  async function handleToggleDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ done: !task.done })
      .eq("id", id);

    if (error) {
      console.error("Ошибка обновления:", error);
      showToast(`Ошибка: ${error.message}`, 'error');
      return;
    }
    loadTasks();
    showToast("✅ Статус задачи изменён", 'success');
  }

  // --- Редактирование: открытие ---
  function openEditModal(task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      priority: task.priority || "medium",
      due_at: task.due_at ? task.due_at.slice(0, 16) : "",
      description: task.description || ""
    });
    setShowModal(true);
  }

  function closeEditModal() {
    setShowModal(false);
    setEditingTask(null);
    setEditForm({ title: "", priority: "medium", due_at: "", description: "" });
  }

  // --- Редактирование: сохранение ---
  async function handleUpdate(e) {
    e.preventDefault();
    if (!editForm.title.trim()) {
      showToast("Введите название задачи!", 'error');
      return;
    }

    let dueAt = null;
    if (editForm.due_at) {
      const dateTimeStr = editForm.due_at.includes('T') ? editForm.due_at : `${editForm.due_at}T00:00:00`;
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        dueAt = date.toISOString();
      }
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editForm.title.trim(),
        priority: editForm.priority,
        due_at: dueAt,
        description: editForm.description.trim()
      })
      .eq("id", editingTask.id);

    if (error) {
      console.error("Ошибка обновления:", error);
      showToast(`Ошибка: ${error.message}`, 'error');
      return;
    }

    closeEditModal();
    loadTasks();
    showToast("✅ Задача обновлена", 'success');
  }

  // --- Фильтрация ---
  let filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.done;
    if (filter === "done") return task.done;
    return true;
  });

  // --- Поиск ---
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // --- Сортировка ---
  filteredTasks.sort((a, b) => {
    if (sortBy === "priority") {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 1) - (order[b.priority] || 1);
    }
    if (sortBy === "due_at") {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at) - new Date(b.due_at);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // --- Форматирование ---
  function formatDue(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ru-RU");
  }

  function isOverdue(task) {
    if (task.done || !task.due_at) return false;
    return Date.parse(task.due_at) < Date.now();
  }

  // --- Иконки приоритетов ---
  function priorityIcon(p) {
    if (p === "high") return "🔴";
    if (p === "medium") return "🟡";
    return "🔵"; // low
  }

  // --- СТАТИСТИКА ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.done).length;
  const activeTasks = tasks.filter(t => !t.done).length;
  const overdueTasks = tasks.filter(t => !t.done && t.due_at && new Date(t.due_at) < new Date()).length;

  // --- Стили для иконок ---
  const iconButtonStyle = {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s',
    padding: 0,
    backgroundColor: '#ed8936',
    color: 'white'
  };

  const deleteIconButtonStyle = {
    ...iconButtonStyle,
    backgroundColor: '#e53e3e'
  };

  // --- Рендер ---
  if (loading) {
    return (
      <div style={{ 
        padding: 40, 
        fontFamily: 'Arial, sans-serif', 
        textAlign: 'center',
        color: '#333'
      }}>
        <div style={{ fontSize: "2rem" }}>⏳ Загрузка...</div>
      </div>
    );
  }

  return (
    <main style={{
      maxWidth: '100%',
      margin: '20px auto',
      padding: '0 16px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <h1 style={{
        textAlign: 'center',
        fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
        marginBottom: '20px',
        color: '#222'
      }}>
        📱 Task Tracker
      </h1>

      {/* === Быстрое добавление === */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="⚡ Быстро добавить задачу... (Enter)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              handleQuickAdd(e.target.value.trim());
              e.target.value = '';
            }
          }}
          style={{
            flex: '1 1 200px',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#333'
          }}
        />
      </div>

      {/* === Статистика === */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f0f4f8',
        borderRadius: '12px',
        border: '1px solid #e0e7ff'
      }}>
        <StatCard label="Всего" value={totalTasks} icon="📋" color="#4a5568" />
        <StatCard label="Активные" value={activeTasks} icon="⏳" color="#2b6cb0" />
        <StatCard label="Выполнено" value={completedTasks} icon="✅" color="#38a169" />
        <StatCard label="Просрочено" value={overdueTasks} icon="⚠️" color="#e53e3e" />
      </div>

      {/* === Форма добавления === */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #eaeaea'
      }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#333' }}>➕ Новая задача</h2>
        <form onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Что нужно сделать?"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              marginBottom: '10px',
              boxSizing: 'border-box',
              backgroundColor: 'white',
              color: '#333'
            }}
            autoFocus
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              marginBottom: '10px',
              minHeight: '60px',
              resize: 'vertical',
              boxSizing: 'border-box',
              backgroundColor: 'white',
              color: '#333'
            }}
          />
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '12px'
          }}>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              style={{
                flex: '1 1 100px',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                minWidth: '100px',
                backgroundColor: 'white',
                color: '#333'
              }}
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
            <input
              type="datetime-local"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
              style={{
                flex: '1 1 150px',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                minWidth: '150px',
                backgroundColor: 'white',
                color: '#333'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '300px'
            }}
          >
            ➕ Добавить задачу
          </button>
        </form>
      </div>

      {/* === Поиск и сортировка --- */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="🔍 Поиск по названию или описанию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#333',
            minWidth: '200px'
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#333',
            minWidth: '160px'
          }}
        >
          <option value="created_at">Сортировать: по дате</option>
          <option value="priority">Сортировать: по приоритету</option>
          <option value="due_at">Сортировать: по дедлайну</option>
        </select>
      </div>

      {/* === Фильтры --- */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {['all', 'active', 'done'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              backgroundColor: filter === f ? '#0070f3' : '#e2e8f0',
              color: filter === f ? 'white' : '#333',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: filter === f ? 'bold' : 'normal'
            }}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Выполненные'}
          </button>
        ))}
      </div>

      {/* === Список задач --- */}
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {filteredTasks.map((task) => (
          <li key={task.id} style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            flexWrap: 'wrap',
            color: '#333'
          }}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => handleToggleDone(task.id)}
              style={{ 
                width: '20px', 
                height: '20px',
                marginTop: '2px',
                cursor: 'pointer',
                accentColor: '#0070f3'
              }}
            />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{
                textDecoration: task.done ? 'line-through' : 'none',
                fontSize: 'clamp(14px, 4vw, 16px)',
                wordBreak: 'break-word',
                marginBottom: '4px',
                color: task.done ? '#718096' : '#1a202c',
                fontWeight: 500
              }}>
                {/* ИЗМЕНЕНО: иконки приоритетов вместо текста */}
                {priorityIcon(task.priority)} {task.title}
              </div>
              {task.description && (
                <div style={{
                  fontSize: '13px',
                  color: '#718096',
                  marginBottom: '6px',
                  lineHeight: '1.4'
                }}>
                  {task.description}
                </div>
              )}
              {task.due_at && (
                <div style={{
                  fontSize: '12px',
                  color: isOverdue(task) ? '#c53030' : '#4a5568',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  📅 {formatDue(task.due_at)}
                  {isOverdue(task) && <span style={{ fontWeight: 'bold', color: '#c53030' }}> (просрочено!)</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => openEditModal(task)}
                title="Редактировать задачу"
                style={{
                  ...iconButtonStyle,
                  backgroundColor: '#ed8936'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.backgroundColor = '#dd6b20';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = '#ed8936';
                }}
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                title="Удалить задачу"
                style={{
                  ...deleteIconButtonStyle,
                  backgroundColor: '#e53e3e'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.backgroundColor = '#c53030';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = '#e53e3e';
                }}
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>

      {filteredTasks.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          color: '#718096', 
          padding: '40px 20px',
          backgroundColor: '#f7fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e0'
        }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>📝 Нет задач</p>
          <p style={{ fontSize: '14px' }}>Добавьте первую задачу!</p>
        </div>
      )}

      {/* === Модальное окно редактирования === */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '16px', 
              fontSize: '1.3rem',
              color: '#1a202c'
            }}>
              ✏️ Редактировать задачу
            </h2>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
                  Название *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    backgroundColor: 'white',
                    color: '#333'
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
                  Описание
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    minHeight: '80px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    backgroundColor: 'white',
                    color: '#333'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '16px'
              }}>
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
                    Приоритет
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
                    Дедлайн
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.due_at}
                    onChange={(e) => setEditForm({...editForm, due_at: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: '#e2e8f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 500
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px'
                  }}
                >
                  💾 Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === Toasts (всплывающие уведомления) === */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'error' ? '#e53e3e' : 
                            toast.type === 'success' ? '#38a169' : '#0070f3',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'slideIn 0.3s ease-out',
            pointerEvents: 'auto'
          }}>
            {toast.message}
          </div>
        ))}
      </div>
    </main>
  );
}

// --- Компонент: карточка статистики ---
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '8px',
      textAlign: 'center',
      border: `1px solid ${color}20`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{icon}</div>
      <div style={{ 
        fontSize: '1.6rem', 
        fontWeight: 'bold',
        color: color 
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.85rem', color: '#666' }}>{label}</div>
    </div>
  );
}