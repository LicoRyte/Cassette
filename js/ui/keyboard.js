/* Solarist: Keyboard shortcuts. */
'use strict';

// keyboard: Space starts or pauses, R resets, S skips (there's no Skip button), H hides the side panels, Esc closes a report or page
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea')) return;
  if (!report.hidden) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closeReport(); } return; }
  if (!page.hidden) { if (e.key === 'Escape') { e.preventDefault(); tab('timer'); } return; }
  if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setClean(!clean); return; }
  if (pv) { if (e.key === 'Escape') { e.preventDefault(); pvClose(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); pvStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); pvStep(1); } return; }
  if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); startB.click(); }
  // R resets and S skips, but only while the timer is stopped, so a stray key never ends a study session
  if ((e.key === 'r' || e.key === 'R') && !running) { e.preventDefault(); resetB.click(); }
  if ((e.key === 's' || e.key === 'S') && !running) { e.preventDefault(); skipB.click(); }
});
