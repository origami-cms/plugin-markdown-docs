window.addEventListener('load', () => {
    const canvas = document.getElementById('progress');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.imageSmoothingEnabled = true;


    const updateProgress = () => {
        let perc = window.scrollY / (document.body.clientHeight - window.innerHeight);
        if (perc > 1) perc = 1;

        ctx.clearRect(0,0,40,40);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(20, 20, 17, 0, 2 * Math.PI);
        ctx.strokeStyle = '#eae3f0';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(20, 20, 17, 0, 2 * Math.PI * perc);
        ctx.strokeStyle = '#693a91';
        ctx.stroke();
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress);
});
