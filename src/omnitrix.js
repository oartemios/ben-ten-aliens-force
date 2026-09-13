export function createOmnitrixUI(onSelect) {
  const menu=document.getElementById('omnitrixMenu');
  const buttons=[...menu.querySelectorAll('[data-form]')];
  let open=false;

  function setOpen(value){
    open=value;
    menu.classList.toggle('open',open);
    menu.setAttribute('aria-hidden',String(!open));
  }

  buttons.forEach(btn=>btn.addEventListener('pointerdown',e=>{
    e.preventDefault();
    onSelect(btn.dataset.form);
    setOpen(false);
  }));

  menu.addEventListener('pointerdown',e=>{
    if(e.target===menu)setOpen(false);
  });

  return {
    toggle(){setOpen(!open)},
    close(){setOpen(false)},
    isOpen(){return open}
  };
}
