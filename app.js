// ---------- 全局数据 ----------
const USER_ROLES = { ADMIN: 'admin', TEACHER: 'teacher', USER: 'user' };
let currentUser = null;
let courseList = JSON.parse(localStorage.getItem('courses')) || [];
let userList = [
    { username: 'admin', password: 'admin', role: USER_ROLES.ADMIN, selectedCourses: [] },
    { username: 'teacher', password: 'teacher', role: USER_ROLES.TEACHER, selectedCourses: [] },
    { username: 'user', password: 'user', role: USER_ROLES.USER, selectedCourses: [] }
];
let categories = JSON.parse(localStorage.getItem('categories')) || [
    { id: 1, name: '编程开发', icon: 'fa-code' },
    { id: 2, name: '设计创意', icon: 'fa-paint-brush' },
    { id: 3, name: '语言学习', icon: 'fa-language' }
];
let currentListTab = 'all', currentPage = 1, pageSize = 6;
let currentDetailCourse = null;
let courseChart, userChart;

// 保存数据到本地
function saveAll() {
    localStorage.setItem('courses', JSON.stringify(courseList));
    localStorage.setItem('userList', JSON.stringify(userList));
    localStorage.setItem('categories', JSON.stringify(categories));
}

// 统计选课人数
function getEnrollCount(cid) {
    return userList.reduce((sum, u) => sum + (u.selectedCourses.includes(cid) ? 1 : 0), 0);
}

// 渲染分类下拉选项
function renderCategoryOptions() {
    const catSelect = document.getElementById('newCourseCategory');
    const filterSelect = document.getElementById('categoryFilter');
    if (catSelect) catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (filterSelect) filterSelect.innerHTML = `<option value="all">全部分类</option>` + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// 渲染课程列表
function renderList() {
    let filtered = [...courseList];
    
    // 权限过滤
    if (currentUser?.role === USER_ROLES.USER) filtered = filtered.filter(c => c.status === 'approved');
    if (currentListTab === 'pending') filtered = filtered.filter(c => c.status === 'pending');
    
    // 搜索过滤
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search));
    
    // 状态过滤
    const statusVal = document.getElementById('statusFilter')?.value;
    if (statusVal && statusVal !== 'all') filtered = filtered.filter(c => c.status === statusVal);
    
    // 分类过滤
    const catId = document.getElementById('categoryFilter')?.value;
    if (catId && catId !== 'all') filtered = filtered.filter(c => c.categoryId == catId);

    // 分页计算
    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);

    // 渲染表格
    const tbody = document.getElementById('courseTableBody');
    if(!tbody) return;
    tbody.innerHTML = pageData.map(c => {
        const cat = categories.find(ct => ct.id == c.categoryId);
        return `
        <tr class="border-b border-white/10 hover:bg-white/5">
            <td class="px-6 py-3 font-medium">${c.name}</td>
            <td class="px-6 py-3"><span class="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">${cat?.name || '未分类'}</span></td>
            <td class="px-6 py-3">${getEnrollCount(c.id)}人</td>
            <td class="px-6 py-3">
                <span class="px-2 py-1 rounded-full text-xs ${c.status === 'approved' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}">
                    ${c.status === 'approved' ? '已审核' : '待审核'}
                </span>
            </td>
            <td class="px-6 py-3 text-right">
                <button onclick="openDetail(${c.id})" class="text-primary mr-3 hover:text-secondary">详情</button>
                ${currentUser?.role === USER_ROLES.ADMIN ? (c.status === 'pending' ? `<button onclick="passCourse(${c.id})" class="text-success mr-3 hover:text-green-600">通过</button>` : '') : ''}
                ${currentUser?.role === USER_ROLES.ADMIN ? `<button onclick="deleteCourse(${c.id})" class="text-danger hover:text-red-600">删除</button>` : ''}
                ${currentUser?.role === USER_ROLES.USER && c.status === 'approved' ? `<button onclick="enrollCourse(${c.id})" class="text-primary hover:text-secondary">选课</button>` : ''}
            </td>
        </tr>`;
    }).join('');

    if (!pageData.length) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400">暂无课程数据</td></tr>';

    // 渲染分页
    const pageDiv = document.getElementById('pagination');
    if (!pageDiv) return;
    let html = `<button onclick="changePage(${currentPage - 1})" class="pagination-btn px-3 py-1 rounded border hover:bg-primary/10 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;
    for (let i = 1; i <= totalPages; i++) html += `<button onclick="changePage(${i})" class="pagination-btn px-3 py-1 rounded border ${currentPage === i ? 'bg-primary text-white' : 'hover:bg-primary/10'}">${i}</button>`;
    html += `<button onclick="changePage(${currentPage + 1})" class="pagination-btn px-3 py-1 rounded border hover:bg-primary/10 ${currentPage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>下一页</button>`;
    pageDiv.innerHTML = html;
}

// 分页切换
window.changePage = (p) => {
    if (p < 1) return;
    const filtered = courseList.filter(c => {
        if (currentUser?.role === 'user') return c.status === 'approved';
        if (currentListTab === 'pending') return c.status === 'pending';
        return true;
    });
    const total = Math.ceil(filtered.length / pageSize);
    if (p > total && total > 0) return;
    currentPage = p;
    renderList();
};

// 列表标签切换
window.switchListTab = (tab) => {
    currentListTab = tab;
    currentPage = 1;
    renderList();
};

// 重置筛选
window.resetFilter = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('categoryFilter').value = 'all';
    currentPage = 1;
    renderList();
};

// 审核课程
window.passCourse = (id) => {
    let c = courseList.find(x => x.id === id);
    if (c) {
        c.status = 'approved';
        saveAll();
        renderList();
        renderStats();
        alert('审核通过');
    }
};

// 删除课程
window.deleteCourse = (id) => {
    if (confirm('彻底删除课程，学员选课记录也将移除')) {
        courseList = courseList.filter(c => c.id !== id);
        userList.forEach(u => { u.selectedCourses = u.selectedCourses.filter(cid => cid !== id); });
        saveAll();
        renderList();
        renderStudentList();
        renderStats();
        alert('删除成功');
    }
};

// 打开课程详情
window.openDetail = (id) => {
    currentDetailCourse = courseList.find(c => c.id === id);
    if (!currentDetailCourse) return;
    const cat = categories.find(c => c.id == currentDetailCourse.categoryId);
    document.getElementById('detailTitle').innerText = currentDetailCourse.name;
    document.getElementById('detailImg').src = currentDetailCourse.cover;
    document.getElementById('detailDesc').innerText = currentDetailCourse.desc;
    document.getElementById('detailCategory').innerText = cat?.name || '未分类';
    document.getElementById('detailAuthor').innerText = currentDetailCourse.author;
    document.getElementById('detailStatus').innerText = currentDetailCourse.status === 'approved' ? '已审核' : '待审核';
    
    const btn = document.getElementById('enrollModalBtn');
    if (currentUser?.role === USER_ROLES.USER && currentDetailCourse.status === 'approved') {
        btn.classList.remove('hidden');
        const isSelected = currentUser.selectedCourses.includes(id);
        btn.innerText = isSelected ? '✅ 已选课' : '📖 选课学习';
        btn.style.opacity = '1';
    } else {
        btn.classList.add('hidden');
    }
    
    renderComments();
    document.getElementById('detailModal').style.display = 'flex';
};

// 关闭详情
window.closeDetail = () => {
    document.getElementById('detailModal').style.display = 'none';
    currentDetailCourse = null;
};

// 选课/退课切换
window.toggleSelectCourse = () => {
    if (!currentDetailCourse || currentUser?.role !== USER_ROLES.USER) return alert('仅学员可选课');
    const idx = currentUser.selectedCourses.indexOf(currentDetailCourse.id);
    if (idx > -1) {
        currentUser.selectedCourses.splice(idx, 1);
    } else {
        currentUser.selectedCourses.push(currentDetailCourse.id);
    }
    const userIdx = userList.findIndex(u => u.username === currentUser.username);
    if (userIdx !== -1) userList[userIdx] = currentUser;
    saveAll();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    openDetail(currentDetailCourse.id);
    renderList();
    renderStudentList();
};

// 快速选课
window.enrollCourse = (cid) => {
    if (currentUser?.role !== USER_ROLES.USER) return;
    if (!currentUser.selectedCourses.includes(cid)) {
        currentUser.selectedCourses.push(cid);
        const userIdx = userList.findIndex(u => u.username === currentUser.username);
        if (userIdx !== -1) userList[userIdx] = currentUser;
        saveAll();
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        alert('选课成功');
        renderList();
        renderStudentList();
    } else {
        alert('已选过该课程');
    }
};

// 渲染评论
function renderComments() {
    if (!currentDetailCourse) return;
    const list = currentDetailCourse.comments || [];
    document.getElementById('commentList').innerHTML = list.map(c => `
    <div class="p-2 bg-white/10 rounded-lg">
        <div class="flex justify-between">
            <span class="font-medium text-primary">${c.user}</span>
            <span class="text-xs text-gray-400">${c.time}</span>
        </div>
        <p>${c.content}</p>
    </div>`).join('') || '<p class="text-gray-400 text-center py-4">暂无评论，来聊聊吧～</p>';
}

// 添加评论
window.addComment = () => {
    if (!currentDetailCourse || !currentUser) return;
    const content = document.getElementById('commentInput').value.trim();
    if (!content) return;
    if (!currentDetailCourse.comments) currentDetailCourse.comments = [];
    currentDetailCourse.comments.unshift({
        user: currentUser.username,
        content,
        time: new Date().toLocaleString()
    });
    saveAll();
    document.getElementById('commentInput').value = '';
    renderComments();
};

// 渲染学员列表
function renderStudentList() {
    const list = userList.filter(u => u.role !== USER_ROLES.ADMIN);
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.map(u => `
    <tr class="border-b border-white/10 hover:bg-white/5">
        <td class="px-6 py-3">${u.username}</td>
        <td class="px-6 py-3">${u.role === 'teacher' ? '👩‍🏫 教师' : '🧑‍🎓 学员'}</td>
        <td class="px-6 py-3">
            <div class="flex flex-wrap gap-1">
                ${u.selectedCourses.map(cid => {
                    const c = courseList.find(c => c.id === cid);
                    return c ? `<span class="bg-primary/20 px-2 py-0.5 rounded-full text-xs">${c.name} <button onclick="removeUserCourse('${u.username}',${cid})" class="text-danger ml-1">✖</button></span>` : '';
                }).join('') || '<span class="text-gray-400">未选课</span>'}
            </div>
        </td>
        <td class="px-6 py-3 text-center">
            <select id="sel_${u.username}" class="input-box text-sm px-2 py-1 rounded">
                <option value="">选择课程</option>
                ${courseList.filter(c => c.status === 'approved' && !u.selectedCourses.includes(c.id)).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
            <button onclick="addUserCourse('${u.username}')" class="ml-2 bg-primary text-white px-3 py-1 rounded text-xs hover:bg-secondary">添加</button>
        </td>
        <td class="px-6 py-3">
            ${currentUser?.role === USER_ROLES.ADMIN ? `<button onclick="deleteUserAccount('${u.username}')" class="text-danger text-sm hover:text-red-600">删除账号</button>` : '-'}
        </td>
    </tr>`).join('');
}

// 管理员为学员添加课程
window.addUserCourse = (un) => {
    const sel = document.getElementById(`sel_${un}`);
    const cid = parseInt(sel.value);
    if (!cid) return;
    const user = userList.find(u => u.username === un);
    if (user && !user.selectedCourses.includes(cid)) {
        user.selectedCourses.push(cid);
        saveAll();
        renderStudentList();
        renderStats();
        alert('添加成功');
    }
};

// 移除学员课程
window.removeUserCourse = (un, cid) => {
    const user = userList.find(u => u.username === un);
    if (user) {
        user.selectedCourses = user.selectedCourses.filter(id => id !== cid);
        saveAll();
        renderStudentList();
        renderStats();
    }
};

// 删除用户账号
window.deleteUserAccount = (un) => {
    if (un === 'admin') return alert('不能删除管理员');
    if (confirm(`删除用户 ${un} 不可恢复`)) {
        userList = userList.filter(u => u.username !== un);
        if (currentUser.username === un) logout();
        saveAll();
        renderStudentList();
        renderStats();
    }
};

// 渲染统计数据
function renderStats() {
    const total = courseList.length;
    const approved = courseList.filter(c => c.status === 'approved').length;
    const pending = total - approved;
    const teacherCount = userList.filter(u => u.role === USER_ROLES.TEACHER).length;
    const userCount = userList.filter(u => u.role === USER_ROLES.USER).length;
    const totalEnroll = userList.reduce((acc, u) => acc + u.selectedCourses.length, 0);

    document.getElementById('statsCourseCount').innerText = total;
    document.getElementById('statsApprovedCourse').innerText = approved;
    document.getElementById('statsPendingCourse').innerText = pending;
    document.getElementById('statsTeacherCount').innerText = teacherCount;
    document.getElementById('statsUserCount').innerText = userCount;
    document.getElementById('statsTotalEnroll').innerText = totalEnroll;

    // 销毁旧图表
    if (courseChart) courseChart.destroy();
    if (userChart) userChart.destroy();

    // 课程状态图表
    const ctx1 = document.getElementById('courseChart')?.getContext('2d');
    if (ctx1) {
        courseChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['已审核', '待审核'],
                datasets: [{ data: [approved, pending], backgroundColor: ['#00B42A', '#FF7D00'] }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    }

    // 用户角色图表
    const ctx2 = document.getElementById('userChart')?.getContext('2d');
    if (ctx2) {
        userChart = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['教师', '普通用户'],
                datasets: [{ data: [teacherCount, userCount], backgroundColor: ['#165DFF', '#36D399'] }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    }
}

// 渲染分类列表
function renderCategoryList() {
    const container = document.getElementById('categoryListContainer');
    if (!container) return;
    container.innerHTML = categories.map(c => `
    <div class="flex justify-between items-center p-4 border-b border-white/10">
        <div><i class="fa ${c.icon} mr-2 text-primary"></i><span>${c.name}</span></div>
        <div>
            <button onclick="openEditCategory(${c.id})" class="text-primary mr-3 hover:text-secondary">编辑</button>
            <button onclick="deleteCategoryById(${c.id})" class="text-danger hover:text-red-600">删除</button>
        </div>
    </div>`).join('');
}

// 打开新增分类弹窗
window.openAddCategoryModal = () => {
    currentEditId = null;
    document.getElementById('categoryModalTitle').innerText = '添加分类';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryIcon').value = 'fa-folder';
    document.getElementById('categoryModal').style.display = 'flex';
};

let currentEditId = null;
// 打开编辑分类弹窗
window.openEditCategory = (id) => {
    const c = categories.find(x => x.id === id);
    if (c) {
        currentEditId = id;
        document.getElementById('categoryModalTitle').innerText = '编辑分类';
        document.getElementById('categoryName').value = c.name;
        document.getElementById('categoryIcon').value = c.icon;
        document.getElementById('categoryModal').style.display = 'flex';
    }
};

// 关闭分类弹窗
window.closeCategoryModal = () => {
    document.getElementById('categoryModal').style.display = 'none';
};

// 保存分类
window.saveCategory = () => {
    const name = document.getElementById('categoryName').value.trim();
    const icon = document.getElementById('categoryIcon').value.trim() || 'fa-folder';
    if (!name) return alert('请输入分类名');
    
    if (currentEditId) {
        const idx = categories.findIndex(c => c.id === currentEditId);
        if (idx !== -1) {
            categories[idx].name = name;
            categories[idx].icon = icon;
        }
    } else {
        categories.push({ id: Date.now(), name, icon });
    }
    
    saveAll();
    renderCategoryList();
    renderCategoryOptions();
    closeCategoryModal();
};

// 删除分类
window.deleteCategoryById = (id) => {
    if (categories.length <= 1) return alert('至少保留一个分类');
    if (confirm('删除分类不会影响已有课程分类显示')) {
        categories = categories.filter(c => c.id !== id);
        saveAll();
        renderCategoryList();
        renderCategoryOptions();
        renderList();
    }
};

// 预览课程封面
window.previewNewCover = () => {
    const f = document.getElementById('newCourseCover').files[0];
    if (f && f.type.startsWith('image/')) {
        const r = new FileReader();
        r.onload = e => {
            document.getElementById('newCoverPreview').src = e.target.result;
            document.getElementById('newCoverPreview').classList.remove('hidden');
        };
        r.readAsDataURL(f);
    }
};

// 发布新课程
window.publishNewCourse = () => {
    const name = document.getElementById('newCourseName').value.trim();
    const desc = document.getElementById('newCourseDesc').value.trim();
    const catId = document.getElementById('newCourseCategory').value;
    const file = document.getElementById('newCourseCover').files[0];
    
    if (!name || !desc || !file) return alert('请填写完整信息');
    if (file.size > 5 * 1024 * 1024) return alert('封面≤5MB');
    
    const reader = new FileReader();
    reader.onload = e => {
        courseList.unshift({
            id: Date.now(),
            name,
            desc,
            categoryId: parseInt(catId),
            cover: e.target.result,
            author: currentUser.username,
            status: currentUser.role === USER_ROLES.ADMIN ? 'approved' : 'pending',
            comments: []
        });
        saveAll();
        document.getElementById('newCourseName').value = '';
        document.getElementById('newCourseDesc').value = '';
        document.getElementById('newCourseCover').value = '';
        document.getElementById('newCoverPreview').classList.add('hidden');
        alert('发布成功');
        switchTab('overview');
        renderList();
        if (currentUser.role === USER_ROLES.ADMIN) renderStats();
    };
    reader.readAsDataURL(file);
};

// 修改密码
window.updatePassword = () => {
    const newPwd = document.getElementById('sysNewPwd').value.trim();
    if (newPwd && currentUser) {
        const u = userList.find(u => u.username === currentUser.username);
        if (u) {
            u.password = newPwd;
            saveAll();
            alert('密码已更新');
            document.getElementById('sysNewPwd').value = '';
        }
    }
};

// 暗黑模式切换
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('dark', document.documentElement.classList.contains('dark'));
};

// 顶部标签切换
function switchTab(tab) {
    // 隐藏所有页面
    ['overview', 'create', 'student', 'stats', 'course', 'system'].forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if(el) el.classList.add('hidden');
    });
    // 显示当前页面
    const page = document.getElementById(`page-${tab}`);
    if(page) page.classList.remove('hidden');
    
    // 切换标签高亮
    document.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${tab}`);
    if(activeTab) activeTab.classList.add('active');

    // 页面初始化
    if (tab === 'student') renderStudentList();
    if (tab === 'stats') renderStats();
    if (tab === 'course') renderCategoryList();
    if (tab === 'create') renderCategoryOptions();
}

// 侧边菜单切换
function switchSideMenu(menu) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const menuEl = document.getElementById(`menu-${menu}`);
    if(menuEl) menuEl.classList.add('active');
    
    if (menu === 'todo') switchTab('overview');
    else if (menu === 'course') switchTab('course');
    else if (menu === 'system') switchTab('system');
}

// 登录
function login() {
    const un = document.getElementById('username').value.trim();
    const pw = document.getElementById('password').value.trim();
    const user = userList.find(u => u.username === un && u.password === pw);
    
    if (!user) {
        alert('账号或密码错误');
        return;
    }
    
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // 切换页面
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
    
    // 显示用户名
    let roleText = '';
    if(user.role === 'admin') roleText = '管理员';
    else if(user.role === 'teacher') roleText = '教师';
    else roleText = '学员';
    document.getElementById('currentUser').innerText = `${user.username} (${roleText})`;
    document.getElementById('sysUsername').value = user.username;
    
    // 权限控制
    const isAdmin = user.role === USER_ROLES.ADMIN;
    const isTeacher = user.role === USER_ROLES.TEACHER;

    // 顶部菜单显示控制
    document.getElementById('tab-create').style.display = (isAdmin || isTeacher) ? 'inline-block' : 'none';
    document.getElementById('tab-student').style.display = (isAdmin || isTeacher) ? 'inline-block' : 'none';
    document.getElementById('tab-stats').style.display = isAdmin ? 'inline-block' : 'none';

    // 初始化数据
    renderList();
    renderCategoryOptions();
    renderCategoryList();
    if (isAdmin || isTeacher) renderStudentList();
    if (isAdmin) renderStats();

    // 默认显示概览
    switchTab('overview');
}

// 退出登录
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainPage').classList.add('hidden');
}

// 页面加载初始化
window.onload = () => {
    // 暗黑模式
    if (localStorage.getItem('dark') === 'true') {
        document.documentElement.classList.add('dark');
    }
    
    // 自动登录
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        try {
            const u = JSON.parse(saved);
            const validUser = userList.find(item => 
                item.username === u.username && item.password === u.password
            );
            
            if (validUser) {
                currentUser = validUser;
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('mainPage').classList.remove('hidden');
                
                let roleText = '';
                if(validUser.role === 'admin') roleText = '管理员';
                else if(validUser.role === 'teacher') roleText = '教师';
                else roleText = '学员';
                document.getElementById('currentUser').innerText = `${validUser.username} (${roleText})`;
                document.getElementById('sysUsername').value = validUser.username;
                
                // 权限
                const isAdmin = validUser.role === USER_ROLES.ADMIN;
                const isTeacher = validUser.role === USER_ROLES.TEACHER;
                document.getElementById('tab-create').style.display = (isAdmin||isTeacher) ? 'inline-block' : 'none';
                document.getElementById('tab-student').style.display = (isAdmin||isTeacher) ? 'inline-block' : 'none';
                document.getElementById('tab-stats').style.display = isAdmin ? 'inline-block' : 'none';
                
                renderList();
                renderCategoryOptions();
                renderCategoryList();
                if(isAdmin||isTeacher) renderStudentList();
                if(isAdmin) renderStats();
                switchTab('overview');
            } else {
                logout();
            }
        } catch (e) {
            logout();
        }
    }
    
    // 点击模态框背景关闭
    const detailModal = document.getElementById('detailModal');
    if(detailModal) detailModal.onclick = () => closeDetail();
    const catModal = document.getElementById('categoryModal');
    if(catModal) catModal.onclick = () => closeCategoryModal();
};