import json
import uuid
from flask import Flask, render_template, request, redirect, url_for, session, flash
from functools import wraps
app = Flask(__name__)
app.secret_key = 'your_super_secret_key' 
USERS_FILE = 'users.json'
TASKS_FILE = 'tasks.json'
def read_json_file(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []
def write_json_file(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        users = read_json_file(USERS_FILE)
        user = next((u for u in users if u['username'] == username and u['password'] == password), None)
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            flash('Logged in successfully!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html')
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        users = read_json_file(USERS_FILE)
        if any(u['username'] == username for u in users):
            flash('Username already exists.', 'danger')
            return redirect(url_for('signup'))
        new_user = {
            'id': str(uuid.uuid4()),  
            'username': username,
            'password': password 
        }
        users.append(new_user)
        write_json_file(USERS_FILE, users)
        flash('Account created successfully! Please log in.', 'success')
        return redirect(url_for('login'))
    return render_template('signup.html')
@app.route('/logout')
@login_required
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))
@app.route('/dashboard')
@login_required
def dashboard():
    all_tasks = read_json_file(TASKS_FILE)
    user_tasks = [task for task in all_tasks if task['userid'] == session['user_id']]
    return render_template('dashboard.html', tasks=user_tasks)
@app.route('/add_task', methods=['POST'])
@login_required
def add_task():
    title = request.form.get('title')
    if title:
        tasks = read_json_file(TASKS_FILE)
        new_task = {
            'id': 'task_' + str(uuid.uuid4()),
            'userid': session['user_id'],
            'title': title,
            'status': 'pending'
        }
        tasks.append(new_task)
        write_json_file(TASKS_FILE, tasks)
        flash('Task added successfully!', 'success')
    else:
        flash('Task title cannot be empty.', 'warning')
    return redirect(url_for('dashboard'))
@app.route('/update_task/<task_id>')
@login_required
def update_task_status(task_id):
    tasks = read_json_file(TASKS_FILE)
    task_found = False
    for task in tasks:
        if task['id'] == task_id and task['userid'] == session['user_id']:
            task['status'] = 'completed' if task['status'] == 'pending' else 'pending'
            task_found = True
            break
    if task_found:
        write_json_file(TASKS_FILE, tasks)
    return redirect(url_for('dashboard'))

@app.route('/delete_task/<task_id>')
@login_required
def delete_task(task_id):
    tasks = read_json_file(TASKS_FILE)
    updated_tasks = [task for task in tasks if not (task['id'] == task_id and task['userid'] == session['user_id'])]
    if len(updated_tasks) < len(tasks):
        write_json_file(TASKS_FILE, updated_tasks)
        flash('Task deleted.', 'info')
    return redirect(url_for('dashboard'))
if __name__ == '__main__':
    app.run(debug=True)
