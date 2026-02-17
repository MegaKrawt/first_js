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
const del_btn = document.querySelector('#del_btn');
const name_input = document.querySelector('#name_input');
const name_select = document.querySelector('#name_select');
const update_cod_app = document.querySelector('#update_cod_app');
const ghost = document.getElementById('ghost');

inputField.addEventListener('scroll', () => {
    ghost.scrollTop = inputField.scrollTop;
    ghost.scrollLeft = inputField.scrollLeft;
});
// Создаем специальный наблюдатель за размером
const resizeObserver = new ResizeObserver(() => {
    // Подстраиваем высоту "призрачного" слоя под реальную высоту textarea
    ghost.style.height = inputField.offsetHeight + 'px';
    ghost.style.width = inputField.offsetWidth + 'px';
});
// Запускаем слежку за твоим инпутом
resizeObserver.observe(inputField);


// Настройка math.js для поддержки любых алфавитов (включая кириллицу)
math.config({
  predictable: false,
  epsilon: 1e-12
});

// Переопределяем правила парсера, чтобы он принимал русские буквы
const isAlphaOriginal = math.parse.isAlpha;
math.parse.isAlpha = function (c, cNext, text) {
  return isAlphaOriginal(c, cNext, text) || (c >= '\u0400' && c <= '\u04FF'); 
  // Диапазон \u0400-\u04FF — это кириллица
};


let saves = JSON.parse(localStorage.getItem('saves'));
// Если localStorage.getItem('saves') вернул null,
// мы инициализируем saves как пустой объект.
if (saves == null) {
    saves = {}
    localStorage.setItem('saves', JSON.stringify(saves))
}

let setting = JSON.parse(localStorage.getItem('setting'));
if (setting == null) {
    setting = {}
    localStorage.setItem('setting', JSON.stringify(setting))
}

name_select.innerHTML = '\n<option value=" ">_________</option>'
Object.keys(saves).forEach((i) => {
    console.log(i)
    name_select.innerHTML += `\n<option value="${i}">${i}</option>`

})


saveButton.addEventListener('click', function(){
    saves = JSON.parse(localStorage.getItem('saves'))
    saves[name_input.value] = inputField.value
    localStorage.setItem('saves', JSON.stringify(saves))

    name_select.innerHTML = '\n<option value=" ">_________</option>'
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

    calculate(true)
    update_cod_app.click()
})

del_btn.addEventListener('click', function(){
    if (confirm('вы точно хотите удалить сохранение ' + name_input.value + ' ?')){
        saves = JSON.parse(localStorage.getItem('saves'))
        delete saves[name_input.value]
        localStorage.setItem('saves', JSON.stringify(saves))

        name_select.innerHTML = '\n<option value=" "> </option>'
        Object.keys(saves).forEach((i) => {
            console.log(i)
            name_select.innerHTML += `\n<option value="${i}">${i}</option>`
        })
    }

})


// обработка чекбоксов
const textarea_div = document.querySelector('#textarea_div')
document.querySelector('#hideResult').addEventListener('change', function() {
    if (!this.checked) {
        result.style.display = 'block';
    } else {
        result.style.display = 'none';
}});
document.querySelector('#hideInput').addEventListener('change', function() {
    const keyboard_=document.getElementById("keyboard")
    const velues_names_=document.getElementById("velues_names")
    if (!this.checked) {
        textarea_div.style.display = 'block';
        button.style.display = 'block';
        document.getElementById("hide_klaviatyr").style.display = 'block';
        keyboard_.style.display = 'grid';
        velues_names_.style.display = "block"
        document.querySelector('#hideKaybord').checked=0
    } else {
        textarea_div.style.display = 'none';
        button.style.display = 'none';
        document.getElementById("hide_klaviatyr").style.display = 'none';
        keyboard_.style.display = 'none';
        velues_names_.style.display = "none"
        document.querySelector('#hideKaybord').checked=1
}});
document.querySelector('#hideKaybord').addEventListener('change', function() {
    const keyboard_=document.getElementById("keyboard")
    const velues_names_=document.getElementById("velues_names")
    if (!this.checked) {
        keyboard_.style.display = 'grid';
    } else {
        keyboard_.style.display = 'none';
}});

// Функция для сохранения
function saveInterfaceSettings() {
    const settings = {
        hideResult: document.querySelector('#hideResult').checked,
        hideInput: document.querySelector('#hideInput').checked,
        hideKaybord: document.querySelector('#hideKaybord').checked
    };
    localStorage.setItem('interfaceSettings', JSON.stringify(settings));
}

// Функция для загрузки
function loadInterfaceSettings() {
    const saved = JSON.parse(localStorage.getItem('interfaceSettings'));
    if (saved) {
        const ids = ['hideResult', 'hideInput', 'hideKaybord'];
        
        ids.forEach(id => {
            const chk = document.querySelector(`#${id}`);
            if (chk && saved[id] !== undefined) {
                chk.checked = saved[id];
                // ВОТ ЗДЕСЬ МАГИЯ: заставляем чекбокс "сработать"
                chk.dispatchEvent(new Event('change'));
            }
        });
    }
}

// Добавляем сохранение к существующим чекбоксам
document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', saveInterfaceSettings);
});

// Запускаем при загрузке страницы
loadInterfaceSettings();






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

    calculate()
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

    calculate()
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

    calculate()
    
    
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
    // const filteredArray = linesArray.filter(line => line.trim() !== '');
    return linesArray
}
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str; // Браузер сам заменит опасные символы на безопасные
    return p.innerHTML;
}

let app_arr_in={}
let app_arr_out={}

function calculate(print_error = false){
    scope = {}
    app_arr_out={}
    old_result = result.innerHTML
    result.innerHTML = 'Результат: <br>'; // Очищаем и ставим заголовок
    let ghostContent = '';
    
    try {
        appForIn = []
        for (const s of processText()) {
            if (s == ''){ghostContent += `<span></span>\n`; continue}
            let isError = false
            let resultText = '';
            if (s[0]=="#"){
              if ("#input" == s.slice(0, 6)){
                  appForIn.push(s.split(" ")[2])
                  try{
                  scope[s.split(" ")[1]]=math.evaluate(app_arr_in[s.split(" ")[2]].value)
                  resultText = ` = ${scope[s.split(" ")[1]]}`;
                  }
                  catch{scope[s.split(" ")[1]]="error"; isError = true}
                }
                if ("#output" == s.slice(0, 7)){
                  app_arr_out[s.split(" ")[2]]=scope[s.split(" ")[1]]
                  resultText = ` = ${scope[s.split(" ")[1]]}`;
                }
            }
            else{
                try{
                    scope[s.split("=")[0]] = math.evaluate(s.split("=")[1], scope); 
                    resultText = ` = ${scope[s.split("=")[0]]}`;
                }catch{scope[s.split('=')[0]]='error'; isError = true}
            };
            if (isError) {
                ghostContent += `<span>${escapeHTML(s)}</span><span style="color: #ff4d4d; font-weight: bold;"> !! ошибка</span>\n`;}
            else if(resultText == " = undefined"){ghostContent += `<span>${escapeHTML(s)}</span><span style="color: #ff4d4d"> = undefined</span>\n`;}
            else{ghostContent += `<span>${escapeHTML(s)}</span><span class="res">${escapeHTML(resultText)}</span>\n`;}
        }; ghost.innerHTML = ghostContent;
        targetDiv.innerHTML = ''
        for (const key in scope){
            if (Object.hasOwn(scope, key)) {
                 result.innerHTML += `<b>${key}</b> = ${scope[key]}<br>`;
                 let newButton = document.createElement('button')
                 newButton.className = 'key-btn'
                 newButton.setAttribute('data-key', key)
                 newButton.textContent = key
                 newButton.style.cssText = "padding-inline: 10px; margin-inline: 10px; min-width: 50px; background-color: #00bfffff; font-size: 25px;";
                //  keyButtons = document.querySelectorAll('.key-btn')
                 targetDiv.appendChild(newButton)

                // touchstart для быстрого отклика на мобильных, click для ПК
                newButton.addEventListener('touchstart', handleVirtualKey);
                newButton.addEventListener('click', handleVirtualKey);
            }
        }
        
    } catch (e) {
        if (print_error){
        // Ловим и отображаем ошибки вычисления
        result.innerHTML = `<span style="color: red;">Ошибка: ${e.message}</span>`;
        console.error("Math.js Error:", e);
        }
        else{result.innerHTML = old_result}
    }
}

let scope = {};
const targetDiv = document.getElementById('velues_names')
button.addEventListener('click', ()=>{calculate(true)});
inputField.addEventListener('input', ()=>{calculate(false)});



// cod_app
const cod_app_in = document.querySelector('#cod_app_in');
const cod_app_out = document.querySelector('#cod_app_out');
cal_cod_app = document.getElementById("cal_cod_app")
update_cod_app.addEventListener("click", ()=>{
  calculate()
    console.log(app_arr_out)
    
    cod_app_in.innerHTML = ''
    cod_app_out.innerHTML = ''
    app_arr_in = {}
    
    appForIn.forEach((i)=>{
    // 1. Создаем элементы
    const text = document.createElement('span');
    const input = document.createElement('input');
    // 2. Настраиваем их
    text.textContent = i + " = "        // Добавляем текст
    text.style.fontSize = "40px"
    input.type = 'tel';        // Указываем тип инпута
    input.style.fontSize = "40px"
    input.style.width = "200px"
    input.addEventListener("input", (e)=>{cal_cod_app.click()})
    app_arr_in[i]=input
    // 3. Добавляем на страницу
    cod_app_in.appendChild(text);
    cod_app_in.appendChild(input);
    cod_app_in.appendChild(document.createElement("br"));
    })
    
    calculate()
    
    s_out=""
    for (const key in app_arr_out){
      s_out += key + " = " + app_arr_out[key] + "<br>"
    }
    newElement = document.createElement('p')
    newElement.innerHTML = s_out
    newElement.style.fontSize = '40px'
    cod_app_out.appendChild(newElement)
})

cal_cod_app.addEventListener("click", ()=>{
    cod_app_out.innerHTML=""
    calculate()
    
    s_out=""
    for (const key in app_arr_out){
      s_out += key + " = " + app_arr_out[key] + "<br>"
    }
    newElement = document.createElement('p')
    newElement.innerHTML = s_out
    newElement.style.fontSize = '40px'
    cod_app_out.appendChild(newElement)
})

