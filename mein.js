// =========================================================================
// 1. ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ DOM
// =========================================================================

const inputField = document.querySelector('#commentField');
const button = document.querySelector('#submitButton');
const result = document.querySelector('#result');
let keyButtons = document.querySelectorAll('.key-btn'); // Все символьные кнопки
const backspaceButton = document.querySelector('#backspaceKey');
const enterButton = document.querySelector('#enterKey');
const saveButton = document.querySelector('#save_btn');
const load_btn = document.querySelector('#load_btn');
const name_input = document.querySelector('#name_input');
const name_select = document.querySelector('#name_select');


let saves = {}
saves = JSON.parse(localStorage.getItem('saves'))
name_select.innerHTML = ''
Object.keys(saves).forEach((i) => {
    console.log(i)
    name_select.innerHTML += `\n<option value="${i}">${i}</option>`

})


saveButton.addEventListener('click', function(){
    saves = JSON.parse(localStorage.getItem('saves'))
    saves[name_input.value] = inputField.value
    localStorage.setItem('saves', JSON.stringify(saves))

    name_select.innerHTML = ''
    Object.keys(saves).forEach((i) => {
        console.log(i)
        name_select.innerHTML += `\n<option value="${i}">${i}</option>`
    })
})

load_btn.addEventListener('click', function(){
    saves = JSON.parse(localStorage.getItem('saves'))
    inputField.value = saves[name_input.value]
})

name_select.addEventListener('change', function(){
    name_input.value = name_select.value

    saves = JSON.parse(localStorage.getItem('saves'))
    inputField.value = saves[name_input.value]
})


// СТАРТОВАЯ НАСТРОЙКА: Сразу делаем поле ReadOnly, чтобы при первом тапе 
// клавиатура телефона не появлялась. Мы вернем его в false позже.
inputField.readOnly = true; 

document.querySelector('#hide_klaviatyr').addEventListener('click', function(){
    inputField.readOnly = false
})

// =========================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================================================================

function insertAtCursor(field, text) {
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = field.value;
    inputField.style.caret_color='black'
    field.value = value.substring(0, start) + text + value.substring(end);

    field.selectionStart = field.selectionEnd = start + text.length;
    // ФОКУС всегда возвращается в основном обработчике
}

function handleBackspace() {
    const start = inputField.selectionStart;
    const end = inputField.selectionEnd;
    const value = inputField.value;

    if (start > 0 || start !== end) {
        if (start === end) {
            inputField.value = value.substring(0, start - 1) + value.substring(end);
            inputField.selectionStart = inputField.selectionEnd = start - 1;
        } else {
            inputField.value = value.substring(0, start) + value.substring(end);
            inputField.selectionStart = inputField.selectionEnd = start;
        }
    }
}

// =========================================================================
// 3. ЕДИНЫЙ ОБРАБОТЧИК КЛАВИАТУРЫ (Адаптация под мобильные)
// =========================================================================

function handleVirtualKey(e) {
    // 1. Предотвращаем стандартное действие браузера (главное для мобильных!)
    e.preventDefault(); 
    
    // 2. ЛОГИКА СКРЫТИЯ КЛАВИАТУРЫ
    // Временно ставим readOnly, чтобы при blur/focus клавиатура телефона скрылась.
    inputField.readOnly = true;
    inputField.blur();
    inputField.focus(); 
    
    // 3. ВСТАВКА СИМВОЛА
    const button = e.currentTarget;
    const keyChar = button.getAttribute('data-key');

    if (keyChar) {
        // Проверяем, это символ новой строки или обычный символ
        const charToInsert = keyChar === '\\n' ? '\n' : keyChar;
        insertAtCursor(inputField, charToInsert);

    } else if (button.id === 'backspaceKey') {
        // УДАЛЕНИЕ
        handleBackspace();
    }
    
    // На всякий случай возвращаем фокус (хотя он уже был возвращен выше)
    inputField.focus();

    // 4. ВОЗВРАЩАЕМ ВОЗМОЖНОСТЬ ввода с внешней клавиатуры (если вы не хотите,
    // чтобы пользователь мог использовать нативную клавиатуру, удалите эту строку)
    // inputField.readOnly = false; 
    
    
}


// =========================================================================
// 4. НАЗНАЧЕНИЕ ОБРАБОТЧИКОВ
// =========================================================================

// Все символьные кнопки
keyButtons.forEach(button => {
    // touchstart для быстрого отклика на мобильных, click для ПК
    button.addEventListener('touchstart', handleVirtualKey);
    button.addEventListener('click', handleVirtualKey);
});

// Кнопка УДАЛИТЬ
backspaceButton.addEventListener('touchstart', handleVirtualKey);
backspaceButton.addEventListener('click', handleVirtualKey);

// Кнопка ВВОД (новая строка)
enterButton.addEventListener('touchstart', handleVirtualKey);
enterButton.addEventListener('click', handleVirtualKey);


// =========================================================================
// 5. ЛОГИКА MATH.JS (Оставлена без изменений)
// =========================================================================

function processText() {
    // 2. Получаем весь текст как одну строку
    const fullText = inputField.value
    // 3. Используем метод split() для разделения строки на массив
    const linesArray = fullText.split(/\r?\n/);
    // Дополнительный шаг: Удаление пустых строк (см. ниже)
    const filteredArray = linesArray.filter(line => line.trim() !== '');
    return filteredArray
}

let newButton = document.createElement('button')
let scope = {};
const targetDiv = document.getElementById('velues_names')
button.addEventListener('click', function(){
    scope = {}
    result.innerHTML = 'Результат: <br>'; // Очищаем и ставим заголовок
    
    try {
        for (const s of processText()) {
            math.evaluate(s, scope); 
        }
        targetDiv.innerHTML = ''
        for (const key in scope){
            if (Object.hasOwn(scope, key)) {
                 result.innerHTML += `<b>${key}</b> = ${scope[key]}<br>`;
                 newButton = document.createElement('button')
                 newButton.className = 'key-btn'
                 newButton.setAttribute('data-key', key)
                 newButton.textContent = key
                 newButton.style.width = '50px'
                 newButton.style.backgroundColor = '#00bfffff'
                 keyButtons = document.querySelectorAll('.key-btn')
                 targetDiv.appendChild(newButton)

                // touchstart для быстрого отклика на мобильных, click для ПК
                newButton.addEventListener('touchstart', handleVirtualKey);
                newButton.addEventListener('click', handleVirtualKey);
                
            }
        }
        
    } catch (e) {
        // Ловим и отображаем ошибки вычисления
        result.innerHTML = `<span style="color: red;">Ошибка: ${e.message}</span>`;
        console.error("Math.js Error:", e);
    }
});