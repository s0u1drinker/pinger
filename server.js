const osNetworkInterfaces = require('os').networkInterfaces()
const http = require('http')
const express = require('express')
const cors = require('cors')
const spawn = require('child_process').spawn
const WebSocket = new require('ws')

const app = express()
const port = 8080
const server = http.createServer(app)

let ping
let interfaces = []

// Формируем список интерфейсов
for (let key in osNetworkInterfaces) {
  for (let item of osNetworkInterfaces[key]) {
    interfaces.push(item.address)
  }
}

app.use(cors())
app.options('*', cors())

app.use(express.static(__dirname + "/public"))
app.use('/', (req, res) => {
  res.sendFile(__dirname + "/public/index.html")
})

// Web-socket server
const WSServer = new WebSocket.Server({server})

WSServer.on('connection', function(ws, req) {
  ws.on('message', function(msg) {
    if (msg === 'stop') {
      // Останавливаем процесс
      ping.kill()
      ws.send('stop')
    } else {
      // Запускаем процесс пинга полученного IP
      ping = spawn('ping', [msg, '-O'])
      // При получении данных
      ping.stdout.on('data', function (data) {
        ws.send(data.toString())
      })
    }
  });

  ws.on('close', function() {
    console.log('Соединение закрыто')
  });
});

// Запускаем сервер
server.listen(port, () => {
  console.log(`Слушаю http://localhost:${port}`)
})
