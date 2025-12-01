const inputField = document.querySelector('#commentField');
const button = document.querySelector('#submitButton');
const result = document.querySelector('#result');

function processText() {
inputField
    // 2. Получаем весь текст как одну строку
    const fullText = inputField.value.replace(/,/g, '.');
    // 3. Используем метод split() для разделения строки на массив
    const linesArray = fullText.split(/\r?\n/);
    // Дополнительный шаг: Удаление пустых строк (см. ниже)
    const filteredArray = linesArray.filter(line => line.trim() !== '');
    return filteredArray
}

let scope = {};
button.addEventListener('click', function(){
    scope = {}
    for (const s of processText()) {
        math.evaluate(s, scope); 
    }
    console.log(scope)
    result.innerHTML = ''
    for (const key in scope){
        result.innerHTML = result.innerHTML + (key + ' = ' + scope[key]) + '<br>'
    }
})



// Получение элементов DOM
const keyButtons = document.querySelectorAll('.key-btn'); // Все кнопки с классом key-btn
const backspaceButton = document.querySelector('#backspaceKey');
// const enterButton = document.querySelector('#enterKey'); <-- Эта кнопка теперь обрабатывается через .key-btn

// Функция для вставки текста в позицию курсора (очень важна для удобства)
// ... (оставить без изменений)

function insertAtCursor(field, text) {
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = field.value;

    field.value = value.substring(0, start) + text + value.substring(end);

    field.selectionStart = field.selectionEnd = start + text.length;
    field.focus(); 
}


// ----------------------------------------------------
// 1. ЛОГИКА ВИРТУАЛЬНОЙ КЛАВИАТУРЫ
// ----------------------------------------------------

// Обработчики для всех символьных кнопок (цифры, операторы, переменные)
keyButtons.forEach(button => {
    button.addEventListener('click', function() {
        const keyChar = button.getAttribute('data-key');
        if (keyChar) {
            insertAtCursor(inputField, keyChar);
        }
    });
});

// Обработчик для кнопки "УДАЛИТЬ"
backspaceButton.addEventListener('click', function() {
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
    inputField.focus();
});