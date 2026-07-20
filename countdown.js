(function () {
  var target = new Date('2026-07-28T19:00:00+03:00').getTime();
  var els = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins: document.getElementById('cd-mins'),
    secs: document.getElementById('cd-secs')
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    var d = Math.max(0, target - Date.now());
    var days = Math.floor(d / 864e5); d -= days * 864e5;
    var hours = Math.floor(d / 36e5); d -= hours * 36e5;
    var mins = Math.floor(d / 6e4); d -= mins * 6e4;
    var secs = Math.floor(d / 1e3);
    els.days.textContent = pad(days);
    els.hours.textContent = pad(hours);
    els.mins.textContent = pad(mins);
    els.secs.textContent = pad(secs);
  }

  tick();
  setInterval(tick, 1000);
})();
