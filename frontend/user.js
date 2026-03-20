const BASE_URL = 'http://localhost:8000';
let weightChartInstance = null;
let currentTargetWeight = null;
let logToDeleteId = null; 

//การเตรียมความพร้อมเมื่อเปิดหน้าเว็บ

window.onload = async () => {
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('display-name').innerText = userName;
    
    try {
        await axios.get(`${BASE_URL}/setup-target-db`);
    } catch(e) {}

    await loadUserInfo();
    await loadData();
    setupModals(); 
}

//ระบบออกจากระบบ

const logout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');

    window.location.href = 'login.html';
}

//การจัดการ "เป้าหมายน้ำหนัก"

const loadUserInfo = async () => {
    try {
        const userId = localStorage.getItem('user_id');
        const response = await axios.get(`${BASE_URL}/users/${userId}`);
        currentTargetWeight = response.data.target_weight;
        
        if (currentTargetWeight) {
            document.getElementById('target-weight-input').value = currentTargetWeight;
            document.getElementById('target-display').innerText = `เป้าหมายปัจจุบันของคุณคือ: ${currentTargetWeight} กิโลกรัม สู้ๆ! ✌️`;
        } else {
            document.getElementById('target-display').innerText = 'คุณยังไม่ได้ตั้งเป้าหมายน้ำหนัก';
        }
    } catch (error) {
        console.error("Error loading user info", error);
    }
}

const saveTarget = async () => {
    const userId = localStorage.getItem('user_id');
    const target_weight = document.getElementById('target-weight-input').value;
    
    if(!target_weight) {
        alert('กรุณาระบุน้ำหนักเป้าหมาย');
        return;
    }
    
    try {
        await axios.put(`${BASE_URL}/users/${userId}/target`, { target_weight });
        document.getElementById('target-success-modal').style.display = 'flex';
        await loadUserInfo();
        await loadData(); 
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกเป้าหมาย');
    }
}

//การโหลดประวัติสุขภาพ (ดึงข้อมูลมาสร้างเป็นกล่องข้อความประวัติ)

const loadData = async () => {
    try {
        const userId = localStorage.getItem('user_id');
        const response = await axios.get(`${BASE_URL}/health-logs/user/${userId}`);
        const logs = response.data;

        const listDOM = document.getElementById('health-list');
        let htmlData = '';
        
        if (logs.length === 0) {
            htmlData = '<p style="text-align:center;">ยังไม่มีข้อมูลการบันทึก</p>';
        }

        for (let i = 0; i < logs.length; i++) {
            let log = logs[i];
            let dateObj = new Date(log.record_date);
            let displayDate = `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;

            htmlData += `
            <div class="log-card">
                <div class="log-info">
                    <strong>📅 ${displayDate}</strong> <br>
                    <span style="font-size: 18px; color:#1e293b;">⚖️ ${log.weight} กก.</span> | 
                    🔥 ${log.calories || 0} kcal <br>
                    <span style="color:#64748b; font-size: 14px;">🏃‍♂️ ${log.exercise_type || 'ไม่ได้ออกกำลังกาย'} (${log.exercise_duration || 0} นาที)</span>
                </div>
                <div class="log-actions">
                    <a href='index.html?id=${log.id}' style="text-decoration: none;">
                        <button class="btn-edit">แก้ไข</button>
                    </a>
                    <button class='delete btn-delete' data-id='${log.id}'>ลบ</button>
                </div>
            </div>`;
        }
        listDOM.innerHTML = htmlData;
        
        const deleteDOMs = document.getElementsByClassName('delete');
        for (let i = 0; i < deleteDOMs.length; i++) {
            deleteDOMs[i].addEventListener('click', (event) => {
                logToDeleteId = event.target.dataset.id;
                document.getElementById('delete-log-modal').style.display = 'flex';
            });
        }
        
//การวาดกราฟเส้น

        const labels = logs.map(log => {
            let d = new Date(log.record_date);
            return `${d.getDate()}/${d.getMonth()+1}`;
        });
        const weightData = logs.map(log => log.weight);
        
        let datasets = [{
            label: 'น้ำหนัก (กก.)',
            data: weightData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.3
        }];

        if (currentTargetWeight) {
            const targetDataArray = logs.map(() => currentTargetWeight);
            datasets.push({
                label: 'เป้าหมาย',
                data: targetDataArray,
                borderColor: '#ef4444',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0
            });
        }

        const ctx = document.getElementById('weightChart').getContext('2d');
        
        if (weightChartInstance) {
            weightChartInstance.destroy();
        }

        weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

//การจัดการหน้าต่างแจ้งเตือน

const setupModals = () => {
    document.getElementById('close-target-success').addEventListener('click', () => {
        document.getElementById('target-success-modal').style.display = 'none';
    });

    document.getElementById('cancel-log-delete').addEventListener('click', () => {
        document.getElementById('delete-log-modal').style.display = 'none';
        logToDeleteId = null;
    });

    document.getElementById('confirm-log-delete').addEventListener('click', async () => {
        if (logToDeleteId) {
            try {
                await axios.delete(`${BASE_URL}/health-logs/${logToDeleteId}`);
                document.getElementById('delete-log-modal').style.display = 'none';
                logToDeleteId = null;
                loadData(); 
            } catch (error) {
                alert('เกิดข้อผิดพลาดในการลบข้อมูล');
            }
        }
    });
}