// Hero drawings: shuffled, one at a time, crossfading.
// Kept in its own file because the site's security policy blocks inline scripts.
(function () {
  // Number of drawings: ink-art-01.webp … ink-art-NN.webp. Bump when adding more.
  var N = 48, HOLD = 7000;
  var order = [];
  for (var i = 1; i <= N; i++) order.push(i);
  for (var j = order.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1)), t = order[j]; order[j] = order[k]; order[k] = t;
  }
  var slides = document.querySelectorAll('#inkFrame .ink-slide');
  var pos = 0, front = 0;
  function src(n) { return 'ink-art-' + (n < 10 ? '0' : '') + n + '.webp'; }
  function show() {
    var img = slides[front];
    img.onload = function () {
      img.classList.add('on');
      slides[1 - front].classList.remove('on');
      front = 1 - front;
      new Image().src = src(order[(pos + 1) % N]);
    };
    img.src = src(order[pos]);
    pos = (pos + 1) % N;
  }
  show();
  if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    setInterval(function () { if (!document.hidden) show(); }, HOLD);
  }
})();
