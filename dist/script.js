const messages={sky:'听着《海阔天空》，提醒自己保持热爱，继续探索。',glory:'《光辉岁月》里那份坚持，是我喜欢 Beyond 的理由之一。'};
document.querySelectorAll('[data-song]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-song]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.getElementById('song-note').textContent=messages[button.dataset.song];}));
