"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [taskText, setTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

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

  async function handleAdd() {
    const text = taskText.trim();
    if (!text) return;

    let dueAt = null;
    if (taskDue) {
      const ms = Date.parse(taskDue);
      dueAt = Number.isNaN(ms) ? null : new Date(ms).toISOString();
    }

    const { error } = await supabase
      .from("tasks")
      .insert([{ title: text, priority: taskPriority, due_at: dueAt, done: false }]);

    if (error) {
      console.error("Ошибка добавления:", error);
      alert(`Ошибка: ${error.message}`);
      return;
    }

    setTaskText("");
    setTaskPriority("medium");
    setTaskDue("");
    loadTasks(); // <-- ПЕРЕЗАГРУЖАЕМ СПИСОК
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Ошибка удаления:", error);
      return;
    }
    loadTasks(); // <-- ПЕРЕЗАГРУЖАЕМ
  }

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
    loadTasks(); // <-- ПЕРЕЗАГРУЖАЕМ
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.done;
    if (filter === "done") return task.done;
    return true;
  });

  function formatDue(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
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

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>⏳ Загрузка...</div>;
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

      {/* Форма добавления */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '20px'
      }}>
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
            boxSizing: 'border-box'
          }}
        />
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
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
          onClick={handleAdd}
          style={{
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '300px',
            alignSelf: 'center'
          }}
        >
          ➕ Добавить задачу
        </button>
      </div>

      {/* Фильтры */}
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

      {/* Список задач */}
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
            backgroundColor: '#fff',
            border: '1px solid #eaeaea',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => handleToggleDone(task.id)}
              style={{ width: '20px', height: '20px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                textDecoration: task.done ? 'line-through' : 'none',
                fontSize: 'clamp(14px, 4vw, 16px)',
                wordBreak: 'break-word'
              }}>
                <strong>[{priorityLabel(task.priority)}]</strong> {task.title}
              </div>
              {task.due_at && (
                <div style={{
                  fontSize: '12px',
                  color: isOverdue(task) ? 'red' : '#666',
                  marginTop: '4px'
                }}>
                  📅 {formatDue(task.due_at)}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(task.id)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>

      {filteredTasks.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 20px' }}>
          <p>📝 Нет задач</p>
          <p style={{ fontSize: '14px' }}>Добавьте первую задачу!</p>
        </div>
      )}
    </main>
  ); 
}