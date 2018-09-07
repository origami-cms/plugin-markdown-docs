window.addEventListener('load', () => {
    const progress = document.getElementById('progress');
    const canvas = progress.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.imageSmoothingEnabled = true;


    const updateProgress = () => {
        let perc = window.scrollY / (document.body.clientHeight - window.innerHeight);
        if (perc > 1) perc = 1;

        ctx.clearRect(0,0,40,40);
        ctx.lineWidth = 2;

        if (perc < 1) {
            ctx.beginPath();
            ctx.arc(20, 20, 17, 0, 2 * Math.PI);
            ctx.strokeStyle = '#eae3f0';
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(20, 20, 17, 0, 2 * Math.PI * perc);
        ctx.strokeStyle = '#693a91';
        ctx.stroke();

        if (perc === 1) progress.classList.add('complete', perc === 1);
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress);
});
