// Update the sidebar on scroll. Additionally scrolls the sidebar into the active
// link.
window.addEventListener('load', () => {
  const aside = document.querySelector('aside');
  const article = document.querySelector('article');
  const headings = Array.from(article.querySelectorAll('*[id]'));
  const tocLinks = Array.from(aside.querySelectorAll('a[href*="#"'));

  let activeLink = tocLinks.find(l => l.classList.contains('active'));

  const findActiveHeading = () => {
    const positions = headings.map(h => {
      const b = h.getBoundingClientRect();
      return [h, b.height + b.top];
    });

    const heading = positions.find(([h, y]) => y > 0) || positions.pop();
    if (!heading) return;
    return heading[0].id;
  }

  const updateSidebar = (id) => {
    const nextLink = tocLinks.find(l => l.href.endsWith(`#${id}`));
    if (!nextLink) return;
    if (activeLink) activeLink.classList.remove('active');
    activeLink = nextLink;
    activeLink.classList.add('active');
    const asideBox = aside.getBoundingClientRect();
    const activeBox = activeLink.getBoundingClientRect();
    const diff = activeBox.top - asideBox.height;
    if (diff >= (activeBox.height * -2)) {
      aside.scrollTop += diff + activeBox.height * 2;
    }
    if (activeBox.top <= activeBox.height * 2) {
      aside.scrollTop -= activeBox.height * 2;
    }

    // console.log(, aside.scrollTop);
  }

  window.addEventListener('scroll', () =>
    updateSidebar(findActiveHeading())
  );
});
