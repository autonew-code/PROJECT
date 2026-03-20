const BASE_URL = 'http://localhost:8000';

//ฟังก์ชันสลับหน้าจอ

const toggleForm = () => {
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    if (loginBox.style.display === 'none') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
    } else {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
    }
}

//ระบบสมัครสมาชิก

const register = async () => {
    const name = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const msgDOM = document.getElementById('reg-message');

    try {
        await axios.post(`${BASE_URL}/register`, { name, username, password });
        msgDOM.className = 'message success';
        msgDOM.innerText = 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ';
        setTimeout(() => toggleForm(), 1500);
    } catch (error) {
        msgDOM.className = 'message danger';
        msgDOM.innerText = error.response ? error.response.data.message : error.message;
    }
}

//ระบบเข้าสู่ระบบ

const login = async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const msgDOM = document.getElementById('login-message');

    try {
        const response = await axios.post(`${BASE_URL}/login`, { username, password });
        
        localStorage.setItem('user_id', response.data.user.id);
        localStorage.setItem('user_name', response.data.user.name);

        msgDOM.className = 'message success';
        msgDOM.innerText = 'เข้าสู่ระบบสำเร็จ กำลังไปหน้า Dashboard...';
        
        setTimeout(() => {
            window.location.href = 'user.html';
        }, 1000);
    } catch (error) {
        msgDOM.className = 'message danger';
        msgDOM.innerText = error.response ? error.response.data.message : error.message;
    }
}