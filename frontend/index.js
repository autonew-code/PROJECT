const BASE_URL = 'http://localhost:8000';

window.onload = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        try {
            const response = await axios.get(`${BASE_URL}/health-logs/${id}`);
            const data = response.data;
            
            document.getElementById('log_id').value = data.id;
            
            const dateStr = new Date(data.record_date).toISOString().split('T')[0];
            document.querySelector('input[name="record_date"]').value = dateStr;
            
            document.querySelector('input[name="weight"]').value = data.weight;
            document.querySelector('input[name="calories"]').value = data.calories;
            document.querySelector('select[name="exercise_type"]').value = data.exercise_type || '';
            document.querySelector('input[name="exercise_duration"]').value = data.exercise_duration;
            document.querySelector('textarea[name="note"]').value = data.note;
        } catch (error) {
            console.error("Error loading data:", error);
        }
    } else {
        document.querySelector('input[name="record_date"]').value = new Date().toISOString().split('T')[0];
    }
}
// ฟังก์ชันสำหรับบันทึกข้อมูล
const saveData = async () => {
    
    const messageDOM = document.getElementById('message');
    
    try {
        const logId = document.getElementById('log_id') ? document.getElementById('log_id').value : '';
        const record_date = document.querySelector('input[name="record_date"]').value;
        const weight = document.querySelector('input[name="weight"]').value;
        const calories = document.querySelector('input[name="calories"]').value || 0;
        const exercise_type = document.querySelector('select[name="exercise_type"]').value;
        const exercise_duration = document.querySelector('input[name="exercise_duration"]').value || 0;
        const note = document.querySelector('textarea[name="note"]') ? document.querySelector('textarea[name="note"]').value : '';

        if (!weight || !record_date) {
            
            messageDOM.className = 'message danger';
            messageDOM.innerText = 'กรุณากรอกวันที่และน้ำหนัก';
            return;
        }

        const logData = {
            user_id: localStorage.getItem('user_id'),
            record_date: record_date,
            weight: parseFloat(weight),
            calories: parseInt(calories),
            exercise_type: exercise_type,
            exercise_duration: parseInt(exercise_duration),
            note: note
        };

        if (logId) {
            await axios.put(`${BASE_URL}/health-logs/${logId}`, logData);
        } else {
            await axios.post(`${BASE_URL}/health-logs`, logData);
        }

        
        messageDOM.className = 'message success';
        messageDOM.innerText = 'บันทึกข้อมูลสำเร็จ! กำลังกลับไปหน้า Dashboard...';
        

        setTimeout(() => {
            window.location.href = 'user.html'; 
        }, 1500);

    } catch (error) {
        console.error(error);
        
        messageDOM.className = 'message danger';
        messageDOM.innerText = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
    }
}