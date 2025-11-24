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



