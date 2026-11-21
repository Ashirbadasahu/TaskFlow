import { testNotification } from "./notificationTest";
import { useEffect, useMemo, useState } from "react";
import { useTaskReminders } from "./useTaskReminders";

const STORAGE_KEY = "digital-task-manager-tasks";

const starterTasks = [
  {
    id: 1,
    title: "Learn React Hooks",
    description: "Practice useState and useEffect",
    category: "Learning",
    priority: "High",
    dueDate: "2026-11-14",
    estimatedTime: 60,
    status: "In Progress",
    createdAt: Date.now(),
  },
  {
    id: 2,
    title: "Work on AI Recruitment Project",
    description: "Complete the backend integration",
    category: "Project",
    priority: "High",
    dueDate: "2026-11-16",
    estimatedTime: 120,
    status: "Pending",
    createdAt: Date.now(),
  },
  {
    id: 3,
    title: "English Speaking Practice",
    description: "Practice speaking for 15 minutes",
    category: "Personal",
    priority: "Medium",
    dueDate: "2026-11-13",
    estimatedTime: 15,
    status: "Completed",
    createdAt: Date.now(),
  },
];

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterTasks;
  } catch {
    return starterTasks;
  }
}

const emptyForm = {
  title: "",
  description: "",
  category: "Personal",
  priority: "Medium",
  dueDate: "",
  alarmDateTime: "",
  estimatedTime: 30,
};

function App() {
  const [tasks, setTasks] = useState(loadTasks);

  const {
    enabled: remindersEnabled,
    enableReminders,
    disableReminders,
  } = useTaskReminders(tasks);

  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

 

  // Save tasks in localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Local date in YYYY-MM-DD format
  function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const today = getLocalDate();

  function isOverdue(task) {
    return (
      task.status !== "Completed" &&
      task.dueDate &&
      task.dueDate < today
    );
  }

  const completedCount = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const pendingCount = tasks.filter(
    (task) => task.status === "Pending"
  ).length;

  const progressCount = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const overdueCount = tasks.filter(isOverdue).length;

  const completionRate = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  // Search, priority and page filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();

      const matchesSearch =
        title.includes(search.toLowerCase()) ||
        description.includes(search.toLowerCase());

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter;

      let matchesPage = true;

      if (activePage === "Today") {
        matchesPage = task.dueDate === today;
      }

      if (activePage === "In Progress") {
        matchesPage = task.status === "In Progress";
      }

      if (activePage === "Completed") {
        matchesPage = task.status === "Completed";
      }

      if (activePage === "Overdue") {
        matchesPage = isOverdue(task);
      }

      return matchesSearch && matchesPriority && matchesPage;
    });
  }, [tasks, search, priorityFilter, activePage, today]);

  // Open add task modal
  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  // Open edit task modal
  function openEditModal(task) {
    setEditingId(task.id);

    setForm({
      alarmDateTime: task.alarmDateTime || "",
      title: task.title || "",
      description: task.description || "",
      category: task.category || "Personal",
      priority: task.priority || "Medium",
      dueDate: task.dueDate || "",
      estimatedTime: task.estimatedTime || 30,
    });

    setShowModal(true);
  }

  // Create or update task
  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) return;

    if (editingId !== null) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingId
            ? {
                ...task,
                ...form,
                estimatedTime: Number(form.estimatedTime),
              }
            : task
        )
      );
    } else {
      const newTask = {
        id: Date.now(),
        ...form,
        estimatedTime: Number(form.estimatedTime),
        status: "Pending",
        createdAt: Date.now(),
      };

      setTasks((current) => [newTask, ...current]);
    }

    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  }

  // Update task status
  function updateStatus(id, status) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status } : task
      )
    );
  }

  // Delete one task
  function deleteTask(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    setTasks((current) =>
      current.filter((task) => task.id !== id)
    );
  }

  // Delete all tasks
  function clearAllTasks() {
    const confirmed = window.confirm("Delete all your tasks?");

    if (!confirmed) return;

    setTasks([]);
  }

  const navigation = [
    { name: "Dashboard", icon: "▦" },
    { name: "My Tasks", icon: "☷" },
    { name: "Today", icon: "◷" },
    { name: "In Progress", icon: "◉" },
    { name: "Completed", icon: "✓" },
    { name: "Overdue", icon: "!" },
  ];

  function formatDate(date) {
    if (!date) return "No deadline";

    return new Date(date + "T00:00:00").toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  const displayTasks =
    activePage === "Dashboard"
      ? filteredTasks.slice(0, 5)
      : filteredTasks;

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">✓</div>

          <div>
            <h2>TaskFlow</h2>
            <span>Digital Task Manager</span>
          </div>
        </div>

        <div className="side-label">MENU</div>

        <nav className="side-nav">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>

              {item.name}

              {item.name === "Overdue" &&
                overdueCount > 0 && (
                  <span className="nav-count">
                    {overdueCount}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-tip">
            <div className="tip-icon">✦</div>
            <strong>Stay productive!</strong>
            <p>
              Small steps every day lead to big results.
            </p>
          </div>

          <button
            className="nav-item settings-button"
            onClick={() => setActivePage("Settings")}
          >
            <span className="nav-icon">⚙</span>
            Settings
          </button>

        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">

        {/* TOPBAR */}
        <header className="topbar">

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-arrow">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">

            <div className="today-date">
              <span>▦</span>
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>

            <button
              className="icon-button"
              title="Notifications"
              onClick={() =>
                setActivePage("Settings")
              }
            >
              ♧
              {overdueCount > 0 && (
                <span className="notification-dot" />
              )}
            </button>

            <div className="profile-wrap">

              <button
                className="profile-button"
                onClick={() =>
                  setShowProfileMenu(!showProfileMenu)
                }
              >
                <div className="avatar">A</div>

                <div className="profile-text">
                  <strong>My Workspace</strong>
                  <span>Personal account</span>
                </div>

                <span>⌄</span>
              </button>

              {showProfileMenu && (
                <div className="profile-menu">
                  <strong>My Workspace</strong>

                  <button
                    onClick={() => {
                      setActivePage("Settings");
                      setShowProfileMenu(false);
                    }}
                  >
                    Settings
                  </button>

                  <button
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Close menu
                  </button>
                </div>
              )}

            </div>
          </div>
        </header>

        {/* SETTINGS PAGE */}
        {activePage === "Settings" ? (

          <section className="content">

            <div className="page-heading">
              <div>
                <p className="eyebrow">PREFERENCES</p>
                <h1>Settings</h1>
                <p className="subheading">
                  Manage your task manager data.
                </p>
              </div>
            </div>

            <div className="settings-card">
              <h3>Notification Reminders</h3>

              <p>
                {remindersEnabled
                  ? "Your task reminders are enabled."
                  : "Enable reminders to receive task notifications."}
              </p>

              <button
                className="secondary-button"
                onClick={
                  remindersEnabled
                    ? disableReminders
                    : enableReminders
                }
              >
                {remindersEnabled
                  ? "🔔 Turn Off Reminders"
                  : "🔔 Enable Reminders"}
              </button>
            </div>

            <div className="settings-card">
              <h3>Local Storage</h3>

              <p>
                Your tasks are saved in this browser on this device.
              </p>

              <button
                className="danger-button"
                onClick={clearAllTasks}
              >
                Delete all tasks
              </button>
            </div>

            <div className="settings-card">
              <h3>About TaskFlow</h3>
              <p>Personal task management made simple.</p>
              <span className="version-label">
                Version 1.0.0
              </span>
            </div>

          </section>

        ) : (

          /* DASHBOARD AND OTHER PAGES */
          <section className="content">

            {/* PAGE HEADING */}
            <div className="page-heading">

              <div>
                <p className="eyebrow">
                  {activePage === "Dashboard"
                    ? "OVERVIEW"
                    : "YOUR WORKSPACE"}
                </p>

                <h1>
                  {activePage === "Dashboard"
                    ? "Good morning, Ashirbad! 👋"
                    : activePage}
                </h1>

                <p className="subheading">
                  {activePage === "Dashboard"
                    ? "Here's what's happening with your tasks today."
                    : "Manage and keep track of your tasks."}
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="heading-actions">
                <button
  type="button"
  className="secondary-button"
  onClick={testNotification}
>
  🔔 Test Notification
</button>

                <button
                  className="secondary-button"
                  onClick={
                    remindersEnabled
                      ? disableReminders
                      : enableReminders
                  }
                >
                  {remindersEnabled
                    ? "🔔 Turn Off Reminders"
                    : "🔔 Enable Reminders"}
                </button>

                <button
                  className="primary-button"
                  onClick={openAddModal}
                >
                  <span>＋</span> Add New Task
                </button>

              </div>
            </div>

            {/* DASHBOARD */}
            {activePage === "Dashboard" && (
              <>

                <div className="stats-grid">

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total Tasks</span>
                      <span className="stat-icon blue">▦</span>
                    </div>
                    <strong>{tasks.length}</strong>
                    <small>All your tasks</small>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Completed</span>
                      <span className="stat-icon green">✓</span>
                    </div>
                    <strong>{completedCount}</strong>
                    <small>Tasks finished</small>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>In Progress</span>
                      <span className="stat-icon purple">◉</span>
                    </div>
                    <strong>{progressCount}</strong>
                    <small>Currently working</small>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Overdue</span>
                      <span className="stat-icon red">!</span>
                    </div>
                    <strong>{overdueCount}</strong>
                    <small>Past deadline</small>
                  </div>

                </div>

                <div className="dashboard-grid">

                  {/* MY TASKS PANEL */}
                  <div className="panel tasks-panel">

                    <div className="panel-heading">

                      <div>
                        <h2>My Tasks</h2>
                        <p>Your latest tasks and activities</p>
                      </div>

                      <button
                        className="text-button"
                        onClick={() => setActivePage("My Tasks")}
                      >
                        View all →
                      </button>

                    </div>

                    <TaskControls
                      search={search}
                      setSearch={setSearch}
                      priorityFilter={priorityFilter}
                      setPriorityFilter={setPriorityFilter}
                    />

                    <TaskList
                      tasks={displayTasks}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      updateStatus={updateStatus}
                      openEditModal={openEditModal}
                      deleteTask={deleteTask}
                      onAdd={openAddModal}
                    />

                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="right-column">

                    <div className="panel progress-panel">

                      <div className="panel-heading">
                        <div>
                          <h2>Productivity</h2>
                          <p>Your overall progress</p>
                        </div>

                        <span className="stat-icon blue">↗</span>
                      </div>

                      <div
                        className="progress-circle"
                        style={{
                          "--progress": `${completionRate}%`,
                        }}
                      >
                        <div className="progress-inner">
                          <strong>{completionRate}%</strong>
                          <span>Completed</span>
                        </div>
                      </div>

                      <div className="progress-caption">
                        {completedCount} of {tasks.length} tasks completed
                      </div>

                      <div className="progress-legend">
                        <span>
                          <i className="legend-dot green-dot" />
                          Completed
                          <b>{completedCount}</b>
                        </span>

                        <span>
                          <i className="legend-dot yellow-dot" />
                          Pending
                          <b>{pendingCount}</b>
                        </span>

                        <span>
                          <i className="legend-dot purple-dot" />
                          In Progress
                          <b>{progressCount}</b>
                        </span>
                      </div>

                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="panel quick-panel">

                      <div className="panel-heading">
                        <div>
                          <h2>Quick Actions</h2>
                          <p>Manage your work faster</p>
                        </div>
                      </div>

                      <button
                        className="quick-action"
                        onClick={openAddModal}
                      >
                        <span className="quick-icon blue">＋</span>

                        <span>
                          <strong>Add a new task</strong>
                          <small>
                            Create a task and set a deadline
                          </small>
                        </span>

                        <b>→</b>
                      </button>

                      <button
                        className="quick-action"
                        onClick={() => setActivePage("Today")}
                      >
                        <span className="quick-icon purple">◷</span>

                        <span>
                          <strong>Today's tasks</strong>
                          <small>
                            See what needs your attention
                          </small>
                        </span>

                        <b>→</b>
                      </button>

                    </div>
                  </div>
                </div>
              </>
            )}

            {/* OTHER TASK PAGES */}
            {activePage !== "Dashboard" && (

              <div className="panel full-tasks-panel">

                <div className="panel-heading">
                  <div>
                    <h2>{activePage}</h2>
                    <p>
                      {filteredTasks.length} task(s) found
                    </p>
                  </div>
                </div>

                <TaskControls
                  search={search}
                  setSearch={setSearch}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                />

                <TaskList
                  tasks={displayTasks}
                  formatDate={formatDate}
                  isOverdue={isOverdue}
                  updateStatus={updateStatus}
                  openEditModal={openEditModal}
                  deleteTask={deleteTask}
                  onAdd={openAddModal}
                />

              </div>
            )}

          </section>
        )}

      </main>

      {/* ADD / EDIT TASK MODAL */}
      {showModal && (

        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
            }
          }}
        >

          <div className="task-modal">

            <div className="modal-heading">

              <div>
                <p className="eyebrow">
                  {editingId !== null ? "UPDATE TASK" : "NEW TASK"}
                </p>

                <h2>
                  {editingId !== null
                    ? "Edit task"
                    : "Create a new task"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <label>
                Task title <span>*</span>

                <input
                  autoFocus
                  required
                  placeholder="What do you need to do?"
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Description

                <textarea
                  rows="3"
                  placeholder="Add some details about your task..."
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                />
              </label>

              <div className="form-row">

                <label>
                  Category

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target.value,
                      })
                    }
                  >
                    <option>Personal</option>
                    <option>Learning</option>
                    <option>Project</option>
                    <option>College</option>
                    <option>Work</option>
                  </select>
                </label>

                <label>
                  Priority

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        priority: event.target.value,
                      })
                    }
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>

              </div>

              <div className="form-row">

                <label>
                  Due date

                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dueDate: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Estimated time (minutes)

                  <input
                    type="number"
                    min="1"
                    value={form.estimatedTime}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        estimatedTime: event.target.value,
                      })
                    }
                  />
                </label>

              </div>

<div className="form-row">
  <label>
    Alarm date & time

    <input
      type="datetime-local"
      value={form.alarmDateTime}
      min={new Date().toISOString().slice(0, 16)}
      onChange={(event) =>
        setForm({
          ...form,
          alarmDateTime: event.target.value,
        })
      }
    />

    <small>Optional: Set a custom voice alarm.</small>
  </label>
</div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingId !== null
                    ? "Save Changes"
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// TASK SEARCH AND FILTER CONTROLS
function TaskControls({
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
}) {
  return (
    <div className="task-controls">

      <div className="search-box">
        <span>⌕</span>

        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <select
        className="filter-select"
        value={priorityFilter}
        onChange={(event) => setPriorityFilter(event.target.value)}
      >
        <option value="All">All priorities</option>
        <option value="High">High priority</option>
        <option value="Medium">Medium priority</option>
        <option value="Low">Low priority</option>
      </select>

    </div>
  );
}

// TASK LIST COMPONENT
function TaskList({
  tasks,
  formatDate,
  isOverdue,
  updateStatus,
  openEditModal,
  deleteTask,
  onAdd,
}) {

  if (tasks.length === 0) {
    return (
      <div className="empty-state">

        <div className="empty-icon">☷</div>

        <h3>No tasks found</h3>

        <p>
          Add a new task or change your search and filters.
        </p>

        <button
          className="primary-button"
          onClick={onAdd}
        >
          ＋ Add New Task
        </button>

      </div>
    );
  }

  return (
    <div className="task-list">

      {tasks.map((task) => (

        <div className="task-row" key={task.id}>

          {/* COMPLETE TASK BUTTON */}
          <button
            className={`task-check ${
              task.status === "Completed" ? "checked" : ""
            }`}
            title="Mark as completed"
            onClick={() => {
              if (task.status === "Completed") {
                updateStatus(task.id, "Pending");
              } else {
                const confirmed = window.confirm(
                  "Have you actually completed this task?"
                );

                if (confirmed) {
                  updateStatus(task.id, "Completed");
                }
              }
            }}
          >
            {task.status === "Completed" ? "✓" : ""}
          </button>

          {/* TASK DETAILS */}
          <div className="task-main">

            <div className="task-title-line">

              <strong
                className={
                  task.status === "Completed"
                    ? "completed-title"
                    : ""
                }
              >
                {task.title}
              </strong>

              <span
                className={`priority ${
                  (task.priority || "Medium").toLowerCase()
                }`}
              >
                {task.priority}
              </span>

            </div>

            {task.description && (
              <p>{task.description}</p>
            )}

            <div className="task-meta">

              <span>▣ {task.category}</span>

              <span
                className={isOverdue(task) ? "overdue-text" : ""}
              >
                ◷ {isOverdue(task) ? "Overdue · " : ""}
                {formatDate(task.dueDate)}
              </span>

              <span>◴ {task.estimatedTime} min</span>
              {task.alarmDateTime && (
  <span>
    🔔 {new Date(task.alarmDateTime).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}
  </span>
)}

            </div>

          </div>

          {/* TASK ACTIONS */}
          <div className="task-actions">

            <select
              className={`status-select ${
                task.status.toLowerCase().replace(" ", "-")
              }`}
              value={task.status}
              onChange={(event) =>
                updateStatus(task.id, event.target.value)
              }
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>

            <button
              title="Edit task"
              onClick={() => openEditModal(task)}
            >
              ✎
            </button>

            <button
              title="Delete task"
              onClick={() => deleteTask(task.id)}
            >
              ⌫
            </button>

          </div>

        </div>

      ))}

    </div>
  );
}

export default App;
