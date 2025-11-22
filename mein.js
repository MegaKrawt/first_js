let n = 0

document.querySelector('button').addEventListener('click', function(){
    n ++
    document.querySelector('.count').textContent = n
})
