// Redirect gate — runs synchronously in <head> before page renders
// If the user didn't come through welcome.html, send them there first
(function () {
  var _e = sessionStorage.getItem('_entered');
  sessionStorage.removeItem('_entered');
  if (!_e) { window.location.replace('/welcome.html'); }
}());
