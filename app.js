const form = document.getElementById('form');
const input = document.getElementById('input');
const list = document.getElementById('list');

let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

function save() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function render() {
  list.innerHTML = '';
  tasks.forEach((task, i) => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    const span = document.createElement('span');
    span.textContent = task.text;
    span.addEventListener('click', () => {
      tasks[i].done = !tasks[i].done;
      save(); render();
    });

    const del = document.createElement('button');
    del.textContent = '✕';
    del.addEventListener('click', () => {
      tasks.splice(i, 1);
      save(); render();
    });

    li.append(span, del);
    list.append(li);
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  tasks.push({ text: input.value.trim(), done: false });
  input.value = '';
  save(); render();
});

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
