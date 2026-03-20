const BASE_URL = 'http://localhost:8000';
let userToDeleteId = null;

//การทำงานเมื่อเปิดหน้าเว็บ (แยกระหว่างหน้า Login และหน้า Admin)

window.onload = async () => {
    const loginBox = document.getElementById('login-box');

    if (loginBox) {
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken) {
            window.location.href = 'admin.html';
        }
    } else {
        const adminToken = localStorage.getItem('admin_token');
        if (!adminToken) {
            window.location.href = 'admin-login.html';
            return;
        }
        await loadUsers();
        setupModals();
    }
}

//ระบบเข้าสู่ระบบแอดมิน

const loginAdmin = async () => {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const msgDOM = document.getElementById('admin-message');

    try {
        const response = await axios.post(`${BASE_URL}/admin-login`, { username, password });
        
        localStorage.setItem('admin_token', response.data.token);

        msgDOM.className = 'message success';
        msgDOM.innerText = 'เข้าสู่ระบบสำเร็จ กำลังไปหน้า Admin...';
        
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    } catch (error) {
        msgDOM.className = 'message danger';
        msgDOM.innerText = error.response ? error.response.data.message : error.message;
    }
}

//ระบบออกจากระบบสำหรับแอดมิน

const logoutAdmin = () => {
    localStorage.removeItem('admin_token');
    window.location.href = 'admin-login.html';
}

//ให้ดึงข้อมูลสุขภาพมาโชว์ในหน้าระบบจัดการ admin

const loadUsers = async () => {
    try {
        
        const response = await axios.get(`${BASE_URL}/users`);
        const users = response.data;

        const listDOM = document.getElementById('users-list');
        
        if (users.length === 0) {
            listDOM.innerHTML = '<p style="text-align:center;">ยังไม่มีผู้ใช้งานในระบบ</p>';
            return;
        }

        
        const userCardsPromises = users.map(async (user) => {
            let targetWeight = 'ไม่ได้ตั้งเป้า';
            let latestWeight = '-';
            let totalLogs = 0;

            try {
                
                const [userRes, logsRes] = await Promise.all([
                    axios.get(`${BASE_URL}/users/${user.id}`),
                    axios.get(`${BASE_URL}/health-logs/user/${user.id}`)
                ]);

                
                if (userRes.data.target_weight) {
                    targetWeight = `${userRes.data.target_weight} กก.`;
                }

               
                const logs = logsRes.data;
                totalLogs = logs.length;
                if (logs.length > 0) {
                    
                    latestWeight = `${logs[logs.length - 1].weight} กก.`;
                }
            } catch (e) {
                console.error("โหลดข้อมูลย่อยไม่สำเร็จ:", e);
            }

        
            return `
            <div class="log-card" style="display: block;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 10px;">
                    <div class="log-info">
                        <span style="font-size: 18px; color:#1e293b; font-weight: bold;">👤 ${user.name}</span> <br>
                        <span style="color:#64748b; font-size: 14px;">Username: ${user.username} | ID: ${user.id}</span>
                    </div>
                    <div class="log-actions">
                        <button class='delete btn-delete' data-id='${user.id}'>ลบบัญชีผู้ใช้</button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; font-size: 14px; color: #334155; flex-wrap: wrap; margin-top: 12px;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 6px 12px; border-radius: 8px;">
                        🎯 เป้าหมาย: <strong>${targetWeight}</strong>
                    </div>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 6px 12px; border-radius: 8px;">
                        ⚖️ น้ำหนักล่าสุด: <strong>${latestWeight}</strong>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 6px 12px; border-radius: 8px;">
                        📝 บันทึกไปแล้ว: <strong>${totalLogs} วัน</strong>
                    </div>
                </div>
            </div>`;
        });

        
        const cardsHtmlArray = await Promise.all(userCardsPromises);
        listDOM.innerHTML = cardsHtmlArray.join('');

        
        const deleteDOMs = document.getElementsByClassName('delete');
        for (let i = 0; i < deleteDOMs.length; i++) {
            deleteDOMs[i].addEventListener('click', (event) => {
                userToDeleteId = event.target.dataset.id;
                document.getElementById('delete-modal').style.display = 'flex';
            });
        }

    } catch (error) {
        document.getElementById('users-list').innerHTML = '<p style="color:red; text-align:center; font-weight:bold;">❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้</p>';
    }
}

//ระบบจัดการหน้าต่างแจ้งเตือน

const setupModals = () => {
    document.getElementById('cancel-delete').addEventListener('click', () => {
        document.getElementById('delete-modal').style.display = 'none';
        userToDeleteId = null;
    });

    document.getElementById('confirm-delete').addEventListener('click', async () => {
        if (userToDeleteId) {
            try {
                await axios.delete(`${BASE_URL}/users/${userToDeleteId}`);
                document.getElementById('delete-modal').style.display = 'none';
                userToDeleteId = null;
                document.getElementById('success-modal').style.display = 'flex';
                loadUsers();
            } catch (error) {
                alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
            }
        }
    });

    document.getElementById('close-success').addEventListener('click', () => {
        document.getElementById('success-modal').style.display = 'none';
    });
}