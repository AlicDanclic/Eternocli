const fs = require('fs').promises;
const path = require('path');

class TaskManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.dataFile = path.join(projectPath, '.tolist', 'tasks.json');
  }

  async ensureProjectDir() {
    const tolistDir = path.join(this.projectPath, '.tolist');
    try {
      await fs.access(tolistDir);
    } catch {
      await fs.mkdir(tolistDir, { recursive: true });
    }
  }

  async loadTasks() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch {
      // 如果文件不存在，返回默认结构
      return {
        habits: [],
        daily: [],
        completed: [],
        lastClearDate: null
      };
    }
  }

  async saveTasks(tasks) {
    await this.ensureProjectDir();
    await fs.writeFile(this.dataFile, JSON.stringify(tasks, null, 2), 'utf8');
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
  }
}

// 初始化项目
async function initProject(projectPath) {
  const manager = new TaskManager(projectPath);
  const defaultTasks = {
    habits: [
      {
        id: manager.generateId(),
        name: '晨间阅读',
        priority: 'medium',
        type: 'habit',
        createdAt: new Date().toISOString()
      },
      {
        id: manager.generateId(),
        name: '运动锻炼',
        priority: 'high',
        type: 'habit',
        createdAt: new Date().toISOString()
      }
    ],
    daily: [
      {
        id: manager.generateId(),
        name: '完成工作日报',
        priority: 'high',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'daily',
        createdAt: new Date().toISOString(),
        completed: false
      }
    ],
    completed: [],
    lastClearDate: new Date().toISOString()
  };

  await manager.saveTasks(defaultTasks);
}

// 清除当日任务和标记
async function clearTasks(projectPath) {
  const manager = new TaskManager(projectPath);
  const tasks = await manager.loadTasks();
  
  // 重置每日任务的完成状态
  tasks.daily = tasks.daily.map(task => ({
    ...task,
    completed: false
  }));
  
  // 清空已完成列表
  tasks.completed = [];
  tasks.lastClearDate = new Date().toISOString();
  
  await manager.saveTasks(tasks);
}

// 标记任务完成
async function completeTask(projectPath, target) {
  const manager = new TaskManager(projectPath);
  const tasks = await manager.loadTasks();
  
  let taskFound = false;
  
  // 在习惯任务中查找
  for (let i = 0; i < tasks.habits.length; i++) {
    if (tasks.habits[i].name === target || tasks.habits[i].id === target) {
      tasks.completed.push({
        ...tasks.habits[i],
        completedAt: new Date().toISOString()
      });
      taskFound = true;
      break;
    }
  }
  
  // 在每日任务中查找
  if (!taskFound) {
    for (let i = 0; i < tasks.daily.length; i++) {
      if (tasks.daily[i].name === target || tasks.daily[i].id === target) {
        tasks.daily[i].completed = true;
        tasks.completed.push({
          ...tasks.daily[i],
          completedAt: new Date().toISOString()
        });
        taskFound = true;
        break;
      }
    }
  }
  
  if (!taskFound) {
    throw new Error(`任务 "${target}" 未找到`);
  }
  
  await manager.saveTasks(tasks);
}

// 展示任务
async function displayTasks(projectPath) {
  const manager = new TaskManager(projectPath);
  const tasks = await manager.loadTasks();
  
  console.log('\n📋 任务管理系统');
  console.log('=' .repeat(50));
  
  console.log('\n🔄 习惯任务:');
  if (tasks.habits.length === 0) {
    console.log('   暂无习惯任务');
  } else {
    tasks.habits.forEach(task => {
      console.log(`   ○ ${task.name} [${getPriorityText(task.priority)}]`);
    });
  }
  
  console.log('\n📅 当日任务:');
  if (tasks.daily.length === 0) {
    console.log('   暂无当日任务');
  } else {
    tasks.daily.forEach(task => {
      const status = task.completed ? '✅' : '⭕';
      const deadline = task.deadline ? ` (截止: ${new Date(task.deadline).toLocaleDateString()})` : '';
      console.log(`   ${status} ${task.name} [${getPriorityText(task.priority)}]${deadline}`);
    });
  }
  
  console.log('\n✅ 已完成任务:');
  if (tasks.completed.length === 0) {
    console.log('   暂无已完成任务');
  } else {
    tasks.completed.slice(-5).forEach(task => { // 显示最近5个完成的任务
      const time = new Date(task.completedAt).toLocaleTimeString();
      console.log(`   ✓ ${task.name} - ${time}`);
    });
  }
  
  console.log('\n' + '=' .repeat(50));
}

// 添加任务
async function addTask(projectPath, name, priority = 'medium', deadline = null, type = 'daily') {
  const manager = new TaskManager(projectPath);
  const tasks = await manager.loadTasks();
  
  const newTask = {
    id: manager.generateId(),
    name,
    priority: priority.toLowerCase(),
    type: type.toLowerCase(),
    createdAt: new Date().toISOString(),
    completed: false
  };
  
  if (deadline) {
    newTask.deadline = new Date(deadline).toISOString();
  }
  
  if (type.toLowerCase() === 'habit') {
    tasks.habits.push(newTask);
  } else {
    tasks.daily.push(newTask);
  }
  
  await manager.saveTasks(tasks);
}

// 删除任务
async function deleteTask(projectPath, taskName) {
  const manager = new TaskManager(projectPath);
  const tasks = await manager.loadTasks();
  
  let deleted = false;
  
  // 从习惯任务中删除
  tasks.habits = tasks.habits.filter(task => task.name !== taskName);
  if (tasks.habits.length < tasks.habits.length + (deleted ? 0 : 1)) {
    deleted = true;
  }
  
  // 从每日任务中删除
  tasks.daily = tasks.daily.filter(task => task.name !== taskName);
  if (tasks.daily.length < tasks.daily.length + (deleted ? 0 : 1)) {
    deleted = true;
  }
  
  // 从已完成任务中删除
  tasks.completed = tasks.completed.filter(task => task.name !== taskName);
  
  if (!deleted) {
    throw new Error(`任务 "${taskName}" 未找到`);
  }
  
  await manager.saveTasks(tasks);
}

// 辅助函数：获取优先级文本
function getPriorityText(priority) {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return priorityMap[priority] || priority;
}

module.exports = {
  initProject,
  clearTasks,
  completeTask,
  displayTasks,
  addTask,
  deleteTask
};