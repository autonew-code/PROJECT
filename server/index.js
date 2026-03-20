const express = require('express')
const bodyparser = require('body-parser')
const mysql = require('mysql2/promise')
const cors = require('cors')
const app = express()

app.use(bodyparser.json())
app.use(cors())

const port = 8000
let conn = null

//เชื่อมต่อและสร้างตารางฐานข้อมูลอัตโนมัติ

const initMySQL = async () => {
  conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'webdb',
    port: 8820
  })
  
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS health_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      record_date DATE NOT NULL,
      weight FLOAT NOT NULL,
      calories INT,
      exercise_type VARCHAR(255),
      exercise_duration INT,
      note TEXT
    )
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL
    )
  `)

  const [checkAdmin] = await conn.query('SELECT * FROM admins')
  if (checkAdmin.length === 0) {
      await conn.query(`INSERT INTO admins (username, password, name) VALUES ('admin', '1234', 'Super Admin')`)
  }
}

//ระบบสมัครสมาชิกและเข้าสู่ระบบ

app.post('/register', async (req, res) => {
  try {
    let { username, password, name } = req.body
    if (!username || !password || !name) throw { message: 'กรุณากรอกข้อมูลให้ครบ' }

    const [checkUser] = await conn.query('SELECT * FROM users WHERE username = ?', [username])
    if (checkUser.length > 0) throw { message: 'Username นี้มีผู้ใช้งานแล้ว' }

    const [results] = await conn.query('INSERT INTO users SET ?', { username, password, name })
    res.json({ message: 'สมัครสมาชิกสำเร็จ', data: results })
  } catch (error) {
    res.status(400).json({ message: error.message || 'Something wrong' })
  }
})

app.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body
    if (!username || !password) throw { message: 'กรุณากรอก Username และ Password' }

    const [users] = await conn.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password])
    if (users.length === 0) throw { message: 'Username หรือ Password ไม่ถูกต้อง' }

    res.json({ message: 'เข้าสู่ระบบสำเร็จ', user: { id: users[0].id, name: users[0].name } })
  } catch (error) {
    res.status(400).json({ message: error.message || 'Something wrong' })
  }
})

app.post('/admin-login', async (req, res) => {
  try {
    let { username, password } = req.body
    if (!username || !password) throw { message: 'กรุณากรอก Username และ Password' }

    const [admins] = await conn.query('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password])
    
    if (admins.length > 0) {
      res.json({ message: 'เข้าสู่ระบบแอดมินสำเร็จ', token: 'admin_token_active' })
    } else {
      throw { message: 'Username หรือ Password ของแอดมินไม่ถูกต้อง' }
    }
  } catch (error) {
    res.status(400).json({ message: error.message || 'Something wrong' })
  }
})

//ระบบจัดการผู้ใช้สำหรับ admin

app.get('/users', async (req, res) => {
  try {
    const [results] = await conn.query('SELECT id, username, name FROM users')
    res.json(results)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message })
  }
})

app.delete('/users/:id', async (req, res) => {
  try {
    let id = req.params.id
    await conn.query('DELETE FROM health_logs WHERE user_id = ?', [id])
    await conn.query('DELETE FROM users WHERE id = ?', [id])
    res.json({ message: 'ลบผู้ใช้เรียบร้อยแล้ว' })
  } catch (error) {
    res.status(500).json({ message: 'Something wrong' })
  }
})

//สร้างคอลัมน์เป้าหมายน้ำหนัก

app.get('/setup-target-db', async (req, res) => {
  try {
    await conn.query('ALTER TABLE users ADD COLUMN target_weight FLOAT DEFAULT NULL');
    res.json({ message: 'สร้างคอลัมน์เป้าหมายสำเร็จ' });
  } catch (error) {
    res.json({ message: 'คอลัมน์นี้ถูกสร้างไว้แล้ว' });
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    let id = req.params.id;
    const [results] = await conn.query('SELECT id, username, name, target_weight FROM users WHERE id = ?', [id]);
    if (results.length == 0) throw { statusCode: 404, message: 'หาไม่เจอ' };
    res.json(results[0]);
  } catch (error) {
    let statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: 'Something wrong', errorMessage: error.message });
  }
});

app.put('/users/:id/target', async (req, res) => {
  try {
    let id = req.params.id;
    let { target_weight } = req.body;
    await conn.query('UPDATE users SET target_weight = ? WHERE id = ?', [parseFloat(target_weight), id]);
    res.json({ message: 'อัปเดตเป้าหมายสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'Something wrong', error: error.message });
  }
});



//ระบบจัดการข้อมูลประวัติสุขภาพ

app.get('/health-logs/user/:user_id', async (req, res) => {
  try {
    let user_id = req.params.user_id
    const [results] = await conn.query('SELECT * FROM health_logs WHERE user_id = ? ORDER BY record_date ASC', [user_id])
    res.json(results)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data', error: error.message })
  }
})

app.post('/health-logs', async (req, res) => {
  try {
    let logData = req.body
    if (!logData.user_id || !logData.record_date || !logData.weight) throw { message: 'ข้อมูลไม่ครบถ้วน' }
    
    const [results] = await conn.query('INSERT INTO health_logs SET ?', logData)
    res.json({ message: 'insert ok', data: results })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Something wrong' })
  }
})

app.get('/health-logs/:id', async (req, res) => {
  try {
    let id = req.params.id
    const [results] = await conn.query('SELECT * FROM health_logs WHERE id = ?', [id])
    if (results.length == 0) throw { statusCode: 404, message: 'หาไม่เจอ' }
    res.json(results[0])
  } catch (error) {
    let statusCode = error.statusCode || 500
    res.status(statusCode).json({ message: 'Something wrong', errorMessage: error.message })
  }
})

app.put('/health-logs/:id', async (req, res) => {
  try {
    let id = req.params.id
    let updateData = req.body
    if(updateData.record_date) {
        updateData.record_date = new Date(updateData.record_date).toISOString().split('T')[0]
    }
    const [results] = await conn.query('UPDATE health_logs SET ? WHERE id = ?', [updateData, id])
    res.json({ message: 'update ok', data: results })
  } catch (error) {
    res.status(500).json({ message: 'Something wrong', error: error.message })
  }
})

app.delete('/health-logs/:id', async (req, res) => {
  try {
    let id = req.params.id
    const [results] = await conn.query('DELETE FROM health_logs WHERE id = ?', [parseInt(id)])
    res.json({ message: 'delete ok', data: results })
  } catch (error) {
    res.status(500).json({ message: 'Something wrong' })
  }
})



app.listen(port, async () => {
  await initMySQL()
  console.log('http server run at ' + port)
})