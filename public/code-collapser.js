window.addEventListener('load', () => {
    const codeBlocks = Array.from(document.querySelectorAll('article pre'));
    const collapser = document.createElement('div');
    collapser.className = 'code-collapser';
    const icon = document.createElement('zen-icon');
    icon.setAttribute('type', 'arrow-down');
    collapser.appendChild(icon);
    collapser.className = 'code-collapser';

    codeBlocks.forEach(cb => {
        const {height} = cb.getBoundingClientRect();
        if (height >= 300) {
            cb.classList.toggle('collapse');
            const collapse = collapser.cloneNode({deep: true});
            collapse.addEventListener('click', () => {
                cb.removeChild(collapse);
                cb.classList.toggle('open');
                cb.appendChild(collapse);
            });
            cb.appendChild(collapse);
        }
    });
});
