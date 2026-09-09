/* ==========================================================================
   PRIDE EARTHWORX / WIZARD ENQUIRY FORM
   --------------------------------------------------------------------------
   Obrazac na stranici Kontakt. Preuzet iz NP Celika, gdje je radjen po
   skillu website-build-rules, korak 8:
     - koraci 1..N su samo dugmad, bez kucanja
     - zadnji korak su tekstualna polja
     - traka napretka na vrhu
     - Nazad na svakom koraku osim prvog
     - dodir na karticu sam vodi dalje
     - dugme za slanje se gasi dok zahtjev traje
     - na uspjeh ide poruka u mjestu, bez preusmjeravanja

   Carried over from the B-Steel build unchanged in behaviour. The two
   language dictionaries it shipped with were collapsed to one English set,
   and the live endpoint constant was cleared. See ENDPOINT below.

   No libraries, same as the rest of the site.
   ========================================================================== */
(function () {
  'use strict';

  var TEL = '0455 660 036';
  var MEJL = 'pride.earthworx@gmail.com';

  var TEKST = {
    korak: function (i, n) { return 'Step ' + i + ' of ' + n; },
    salji: 'Sending...',
    nedostaje: 'We need your name and phone number so we can get back to you.',
    greska: 'That did not send. Call ' + TEL + ' or email ' + MEJL + '.'
  };

  /* ------------------------------------------------------------------------
     ENDPOINT
     ------------------------------------------------------------------------
     Paste the Apps Script URL here after running Skill 03.

     This was carried over from the B-Steel build, which shipped with a live
     /exec address in this constant. That address has been removed: leaving
     it in would post every Pride Earthworx enquiry into another client's
     inbox and spreadsheet. Do not restore it.

     While this is empty the form still validates and steps, but submitting
     sends nothing: it logs a warning to the console and shows the failure
     message with the phone number in it. That is deliberate. Nobody should
     see "enquiry received" for an enquiry that went nowhere.
     ------------------------------------------------------------------------ */
  var ENDPOINT = '';

  var form = document.getElementById('wizard');
  if (!form) { return; }

  var steps = Array.prototype.slice.call(form.querySelectorAll('.wstep'));
  var ticks = Array.prototype.slice.call(form.querySelectorAll('.wizard__tick'));
  var count = form.querySelector('.wizard__count');
  var back = form.querySelector('.wnav__back');
  var next = form.querySelector('.wnav__next');
  var submit = form.querySelector('.wnav__submit');
  var err = form.querySelector('.wizard__err');
  var done = document.querySelector('.wizard__done');
  var i = 0;

  function render() {
    steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
    ticks.forEach(function (t, n) { t.classList.toggle('is-done', n <= i); });
    if (count) { count.textContent = TEKST.korak(i + 1, steps.length); }
    back.hidden = i === 0;

    var last = i === steps.length - 1;
    next.hidden = last;
    submit.hidden = !last;

    /* Fokus na naslov koraka, da citac ekrana i tastatura prate promjenu.
       Bez ovoga se poslije klika fokus vrati na pocetak dokumenta. */
    var q = steps[i].querySelector('.wstep__q');
    if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
  }

  function go(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    render();
  }

  /* Dodir na karticu bira odgovor i sam vodi na sljedeci korak. */
  form.addEventListener('click', function (e) {
    var opt = e.target.closest('.wopt');
    if (opt) {
      var group = opt.closest('.wopts');
      Array.prototype.forEach.call(group.querySelectorAll('.wopt'), function (b) {
        b.classList.remove('is-picked');
        b.setAttribute('aria-pressed', 'false');
      });
      opt.classList.add('is-picked');
      opt.setAttribute('aria-pressed', 'true');
      group.dataset.value = opt.dataset.value;
      if (i < steps.length - 1) { window.setTimeout(function () { go(i + 1); }, 160); }
      return;
    }
    if (e.target.closest('.wnav__back')) { go(i - 1); }
    if (e.target.closest('.wnav__next')) { go(i + 1); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;

    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll('.wopts'), function (g) {
      data[g.dataset.name] = g.dataset.value || '';
    });
    Array.prototype.forEach.call(form.querySelectorAll('.wfield input, .wfield textarea'), function (f) {
      data[f.name] = f.value.trim();
    });

    if (!data.ime || !data.telefon) {
      err.textContent = TEKST.nedostaje;
      err.hidden = false;
      return;
    }

    submit.disabled = true;
    var label = submit.querySelector('.btn__label');
    var old = label ? label.textContent : '';
    if (label) { label.textContent = TEKST.salji; }

    function ok() {
      form.hidden = true;
      if (done) { done.classList.add('is-shown'); }
    }

    function fail() {
      submit.disabled = false;
      if (label) { label.textContent = old; }
      err.textContent = TEKST.greska;
      err.hidden = false;
    }

    if (!ENDPOINT) {
      window.console.warn('Pride Earthworx: ENDPOINT is empty, the enquiry was NOT sent.', data);
      fail();
      return;
    }

    /* GET sa parametrima u adresi, ne POST. Apps Script svaki POST preusmjeri
       na sesijsku adresu i usput ga pretvori u GET, cime se gubi telo
       zahtjeva. Uz to ide no-cors, jer Apps Script ne salje CORS zaglavlja.

       Posljedica no-cors: pretrazivac ne moze da procita odgovor, pa se
       potvrda prikazuje bez obzira na to da li je slanje uspjelo. Greska se
       vidi samo ako sam zahtjev pukne (nema mreze). To je poznata granica
       ovog nacina. */
    data.strana = window.location.pathname;

    var upit = Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');

    window.fetch(ENDPOINT + '?' + upit, { method: 'GET', mode: 'no-cors' })
      .then(ok)
      .catch(fail);
  });

  render();
}());
