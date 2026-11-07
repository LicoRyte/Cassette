/* Solarist: Keyboard shortcuts. */
'use strict';

// keyboard: 1-4 pick the mission, Space starts or pauses, Esc closes a report or page
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea')) return;
  if (!report.hidden) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closeReport(); } return; }
  if (!page.hidden) { if (e.key === 'Escape') { e.preventDefault(); tab('timer'); } return; }
  if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setClean(!clean); return; }
  if (pv) { if (e.key === 'Escape') { e.preventDefault(); pvClose(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); pvStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); pvStep(1); } return; }
  if (/^[1-5]$/.test(e.key)) { const b = misBtns[+e.key - 1]; if (b && !b.disabled && !b.hidden) { e.preventDefault(); b.click(); } }
  else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); startB.click(); }
});
