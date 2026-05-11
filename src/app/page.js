"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  // --- State для формы добавления ---
  const [taskText, setTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  
  // --- State для списка и фильтров ---
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  
  // --- State для модального окна редактирования ---
  const [editingTask, setEditingTask] = useState(null);  // объект задачи или null
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    priority: "medium",
    due_at: "",
    description: ""
  });

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

  // --- Добавление новой задачи ---
  async function handleAdd(e) {
    e.preventDefault();
    const text = taskText.trim();
    if (!text) {
      alert("Введите название задачи!");
      return;
    }

    let dueAt = null;
    if (taskDue) {
      const ms = Date.parse(taskDue);
      dueAt = Number.isNaN(ms) ? null : new Date(ms).toISOString();
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
      alert(`Ошибка: ${error.message}`);
      return;
    }

    // Очистка формы
    setTaskText("");
    setTaskPriority("medium");
    setTaskDue("");
    setTaskDescription("");
    loadTasks();
  }

  // --- Удаление задачи ---
  async function handleDelete(id) {
    if (!confirm("Удалить эту задачу?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Ошибка удаления:", error);
      alert(`Ошибка: ${error.message}`);
      return;
    }
    loadTasks();
  }

  // --- Отметка выполнено/не выполнено ---
  async function handleToggleDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ done: !task.done })
      .eq("id", id);

    if (error) {
      console.error("Ошибка обновления:", error);
      return;
    }
    loadTasks();
  }

  // --- Открытие модального окна редактирования ---
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

  // --- Сохранение изменений ---
  async function handleUpdate(e) {
    e.preventDefault();
    if (!editForm.title.trim()) {
      alert("Введите название задачи!");
      return;
    }

    let dueAt = null;
    if (editForm.due_at) {
      const ms = Date.parse(editForm.due_at);
      dueAt = Number.isNaN(ms) ? null : new Date(ms).toISOString();
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
      alert(`Ошибка: ${error.message}`);
      return;
    }

    closeEditModal();
    loadTasks();
  }

  // --- Фильтрация ---
  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.done;
    if (filter === "done") return task.done;
    return true;
  });

  // --- Форматирование даты ---
  function formatDue(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ru-RU");
  }

  function isOverdue(task) {
    if (task.done || !task.due_at) return false;
    return Date.parse(task.due_at) < Date.now();
  }

  function priorityLabel(p) {
    if (p === "low") return "Низкий";
    if (p === "high") return "Высокий";
    return "Средний";
  }

  // --- Сортировка: просроченные в начале ---
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.done === b.done) {
      // Если обе не выполнены — сначала просроченные
      if (!a.done && !b.done) {
        if (isOverdue(a) && !isOverdue(b)) return -1;
        if (!isOverdue(a) && isOverdue(b)) return 1;
      }
      return 0;
    }
    return a.done ? 1 : -1;  // не выполненные первыми
  });

  // --- Рендер ---
  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif", textAlign: "center" }}>
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
        marginBottom: '20px'
      }}>
        📱 Task Tracker
      </h1>

      {/* === Форма добавления === */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>➕ Новая задача</h2>
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
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '10px',
              boxSizing: 'border-box'
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
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '10px',
              minHeight: '60px',
              resize: 'vertical',
              boxSizing: 'border-box'
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
                border: '1px solid #ddd',
                borderRadius: '6px',
                minWidth: '100px'
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
                border: '1px solid #ddd',
                borderRadius: '6px',
                minWidth: '150px'
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

      {/* === Фильтры === */}
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
              backgroundColor: filter === f ? '#0070f3' : '#f0f0f0',
              color: filter === f ? 'white' : 'black',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px'
            }}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Выполненные'}
          </button>
        ))}
      </div>

      {/* === Список задач === */}
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {sortedTasks.map((task) => (
          <li key={task.id} style={{
            backgroundColor: '#fff',
            border: '1px solid #eaeaea',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            flexWrap: 'wrap'
          }}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => handleToggleDone(task.id)}
              style={{ 
                width: '20px', 
                height: '20px',
                marginTop: '2px',
                cursor: 'pointer'
              }}
            />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{
                textDecoration: task.done ? 'line-through' : 'none',
                fontSize: 'clamp(14px, 4vw, 16px)',
                wordBreak: 'break-word',
                marginBottom: '4px'
              }}>
                <strong>[{priorityLabel(task.priority)}]</strong> {task.title}
              </div>
              {task.description && (
                <div style={{
                  fontSize: '13px',
                  color: '#666',
                  marginBottom: '6px',
                  lineHeight: '1.4'
                }}>
                  {task.description}
                </div>
              )}
              {task.due_at && (
                <div style={{
                  fontSize: '12px',
                  color: isOverdue(task) ? '#d32f2f' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  📅 {formatDue(task.due_at)}
                  {isOverdue(task) && <span style={{ color: '#d32f2f', fontWeight: 'bold' }}> (просрочено!)</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => openEditModal(task)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                ✏️ Редактировать
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                🗑️ Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>

      {sortedTasks.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 20px' }}>
          <p>📝 Нет задач</p>
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
            <h2 style={{ marginTop: 0, marginBottom: '16px' }}>✏️ Редактировать задачу</h2>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
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
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Описание
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    minHeight: '80px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
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
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Приоритет
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
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
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxSizing: 'border-box'
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
                    backgroundColor: '#e0e0e0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px'
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
    </main>
  );
}