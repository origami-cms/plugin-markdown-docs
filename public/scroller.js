window.addEventListener('load', () => {
  const article = document.querySelector('article');
  const headings = Array.from(article.querySelectorAll('h1, h2'));
  const tocLinks = Array.from(document.querySelectorAll('aside a[href*="#"'));

  let activeLink = tocLinks.find(l => l.classList.contains('active'));

  const findActiveHeading = () => {
    const y = window.scrollY;

    const positions = headings.map(h => {
      const b = h.getBoundingClientRect();
      return [h, b.height + b.top];
    });

    const heading = positions.find(([h, y]) => y > 0) || positions.pop();
    if (!heading) return;
    return heading[0].id;
  }

  const updateSidebar = (id) => {
    if (activeLink) activeLink.classList.remove('active');
    activeLink = tocLinks.find(l => l.href.endsWith(`#${id}`));
    activeLink.classList.add('active');
  }

  window.addEventListener('scroll', () =>
    updateSidebar(findActiveHeading())
  );
});
