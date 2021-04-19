const text = document.querySelector('.text')
const textCtrl = document.querySelector('.text-controller')
const btnPing = document.querySelector('.btn_ping')
const btnPingStop = document.querySelector('.btn_ping_stop')
const ip = document.querySelector('#ip')
const canvasWrapper = document.querySelector('.canvas-wrapper')
const canvas = document.querySelector('#canvas')
const context = canvas.getContext('2d')
const pingCur = document.querySelector('.ping_cur')
const pingMax = document.querySelector('.ping_max')
const pingAvg = document.querySelector('.ping_avg')
const socket = new WebSocket('ws://localhost:8080')
// Палитра цветов
const colors = {
  black: 'black',
  green: 'green',
  red: 'red'
}
const canvasBox = canvas.getBoundingClientRect()
// Отступы от края Canvas
const paddingX = 25
const paddingY = 25
// Ширина и высота Canvas
const canvasHeight = canvas.height
const canvasDefaultWidth = canvas.width
let canvasWidth = canvasDefaultWidth
// Начало координат
const startX = paddingX
const startY = canvasHeight - paddingY
// Смещение в пикселях
let stepX = 10
let stepY = 10
// Длина оси Y
const lengthAxisY = canvasHeight - paddingX * 2
// Максимальное значение пинга на графике
let maxDrawY = lengthAxisY - 1
// Массив со значениями пинга
let pingData = []
// Массив с "дропами"
let dropData = []
// Максимальное значение пинга
let max = 0
let curX = 0

btnPing.onclick = function () {
  pingData = []
  dropData = []
  max = 0
  pingCur.innerHTML = '-'
  pingMax.innerHTML = '-'
  pingAvg.innerHTML = '-'
  btnPing.setAttribute('disabled', 'disabled')
  btnPingStop.removeAttribute('disabled')
  canvas.width = canvasDefaultWidth
  canvasWidth = canvasDefaultWidth
  // Отправляем IP-адрес
  socket.send(ip.value)
}

btnPingStop.onclick = function () {
  btnPing.removeAttribute('disabled')
  btnPingStop.setAttribute('disabled', 'disabled')
  // Отправляем команду "stop"
  socket.send('stop')
}

socket.onmessage = function(event) {
  const rawData = event.data

  let ms

  // Записываем "логи"
  text.value += rawData

  if (event.data !== 'stop') {
    let dt = new Date()
    if (~rawData.indexOf('time')) {
      // Вырезаем часть строки с милисекундами
      ms = Math.ceil(parseFloat(rawData.split('time=')[1]))
      // ms = Math.floor(Math.random() * Math.floor(300))
      // if (ms < 100) { ms = 0; dropData.push({
      //  order: pingData.length+1,
      //  dt
      // }) }
    } else {
      // Если в ответе нет информации о времени, то это "дроп"
      ms = 0
      // Добавляем элемент в массив "дропов"
      dropData.push({
        order: pingData.length+1,
        dt
      })
    }
    // Добавляем значение пинга и время в массив
    pingData.push({
      ping: ms,
      dt
    })
    // Обновляем значение текущего пинга в статистике
    pingCur.innerHTML = ms
    if (ms > 0) {
      // Обновляем среднее значение пинга
      pingAvg.innerHTML = calcAveragePing()
      // Обновляем значение максимального пинга
      if (ms > max) {
        max = ms
        pingMax.innerHTML = max
        // Обновляем значения шага по оси Y
        calculateStepY()
      }
    }
    // Рисуем
    drawGraphic()
  } else {
    // Рисуем отметку об окончании
    drawTime(1)
  }
}

const textCtrlShow ='Показать логи'
const textCtrlHide ='Убрать этот ужас!'
const textHideClass = 'text_hide'

textCtrl.innerHTML = textCtrlShow
textCtrl.onclick = function () {
  if (text.classList.contains(textHideClass)) {
    textCtrl.innerHTML = textCtrlHide
    text.classList.remove(textHideClass)
  } else {
    textCtrl.innerHTML = textCtrlShow
    text.classList.add(textHideClass)
  }
}

// Считает среднее значение пинга
function calcAveragePing () {
  let sum = 0

  pingData.forEach(item => sum += item.ping)

  return Math.ceil(sum / pingData.length)
}

// Обновляет значения шага по оси Y
function calculateStepY () {
  stepY = (max >= maxDrawY) ? 1 : Math.floor(lengthAxisY / max)
}

// Вычисляет координаты точки по оси Y
function calculateY (val) {
  return (val >= maxDrawY) ? paddingY : lengthAxisY + paddingY - val * stepY
}

// Очищает canvas
function clearCanvas () {
  context.clearRect(0, 0, canvas.width, canvas.height)
}

// Рисует координатные линии
function drawAxes () {
  context.beginPath()
  context.moveTo(paddingX, paddingY)
  context.lineTo(startX, startY)
  context.lineTo(canvasWidth - paddingX, startY)
  context.lineWidth = 2
  context.strokeStyle = colors.black
  context.stroke()
}

// Рисует отметку максимального значения по оси Y
function drawMax () {
  if (max > 0) {
    let y = calculateY(max)
    let x = (max > 9) ? 1 : 7

    context.beginPath()

    context.fillStyle = colors.black
    context.strokeStyle = colors.black
    
    if (max > 99) {
      if (max > maxDrawY) {
        context.font = '9px Arial'
        context.fillText(`${maxDrawY}+`, x, y+2)
      } else {
        context.font = '12px Arial'
        context.fillText(max, x, y+5)
      }
    } else {
      context.font = '16px Arial'
      context.fillText(max, x, y+5)
    }

    context.moveTo(startX - 3, y)
    context.lineTo(startX + 3, y)
    context.stroke()
  }
}

// Рисует "дроп" пакета
function drawDrop (coordX) {
  context.fillStyle = colors.red
  context.moveTo(coordX, paddingY)
  context.fillRect(coordX, paddingY, stepX, maxDrawY)
}

// Рисует график
function drawGraphic () {
  let x = startX
  let y
  let maxTickX = ((canvasWidth - paddingX * 2) / stepX) + 1

  // Чистим canvas
  clearCanvas()
  
  // Если количество элементов >= числу максимально возможных элементов для отрисовывания
  if (pingData.length >= maxTickX) {
    // Расширяем canvas
    canvasWidth += 250
    canvas.width = canvasWidth
    // Скроллим вправо
    canvasWrapper.scrollLeft = canvasWidth
  }

  // Рисуем оси координат
  drawAxes()

  // Рисуем отметку о начале
  drawTime(0)

  // Рисуем отметку с максимальным значением
  drawMax()

  context.lineJoin = 'round'
  context.lineWidth = 2

  if (pingData[0].ping > 0) {
    y = calculateY(pingData[0].ping)
    context.moveTo(x, y)
  } else {
    drawDrop(x)
  }

  for (let i=1; i<pingData.length; i++) {
    // Рисуем график
    if (pingData[i].ping === 0) {
      if (pingData[i-1].ping === 0) {
        x += stepX
      }
      drawDrop(x)
    } else {
      x += stepX
      y = calculateY(pingData[i].ping)

      if (pingData[i-1].ping === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }
  }

  curX = x

  context.strokeStyle = colors.green
  context.stroke()
}

// Рисует отметку времени на оси X
function drawTime (direction) {
  let text
  let dt
  let x
  let y

  context.beginPath()

  if (!direction) {
    // Отметка о начале
    context.moveTo(startX, startY)
    context.lineTo(startX, startY + 12)
    dt = pingData[0].dt
    x = startX + 5
    y = startY + 12
  } else {
    // Отметка об окончании
    let offsetX = curX

    if (pingData[pingData.length - 1].ping === 0) {
      offsetX += stepX
    }

    context.moveTo(offsetX, startY)
    context.lineTo(offsetX, startY + 12)
    dt = pingData[pingData.length - 1].dt
    x = offsetX + 5
    y = startY + 12
  }

  context.strokeStyle = colors.black
  context.stroke()

  text = `${prettyNumber(dt.getHours())}:${prettyNumber(dt.getMinutes())}:${prettyNumber(dt.getSeconds())}`

  context.font = '12px Arial'
  context.fillStyle = colors.black
  context.fillText(text, x, y)
}

// Приписывает 0, если число менее 10 (Для красивого отображения в дате и времени)
function prettyNumber (num) {
  return (num < 10) ? '0' + num : num
}
