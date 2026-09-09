/* ==========================================================================
   B-STEEL / JS
   --------------------------------------------------------------------------
   1. Mobilni meni
   2. Pojavljivanje na skrol

   Sistem pokreta je preslikan iz Strux chunkova. Vrijednosti nisu
   procijenjene sa snimka ekrana nego izvucene iz koda:

     kriva      cubic-bezier(.44, 0, .56, 1)   -- jedina na cijelom sajtu
     od         opacity 0, translateY 50px
     do         opacity 1, translateY 0
     trajanje   0.6s za velike blokove, 0.4s podrazumijevano, 0.3s za UI
     stepen     kasnjenje u koracima od 0.1s
     okidac     IntersectionObserver, threshold 0
     hover      scale 1.08 na slikama

   Puna analiza: research/2026-08-09-strux-template-teardown.md

   Original je sve to dobio uz React, Framer Motion i 1.6 MB chunkova.
   Ovdje je isto ponasanje u cistom CSS-u i skripti ispod, bez biblioteka.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. MOBILNI MENI
     ------------------------------------------------------------------------ */

  var toggle = document.getElementById('menu-toggle');
  var nav    = document.getElementById('nav');

  if (toggle && nav) {

    /* Do 10.08.2026. je hamburger sirio samo zaglavlje i tu ispisivao
       linkove. Sada otvara pun meni preko ekrana, po "staggered menu"
       obrascu iz Random projekta. Cijela koreografija je u CSS-u; ovdje
       se samo prebacuje klasa i drzi pristupacnost.

       Stari nacin nije obrisan: ako oznake #smenu nema, sve radi kao
       prije, preko data-open na navigaciji i data-menu na zaglavlju. */
    var headerEl = document.getElementById('header');
    var smenu    = document.getElementById('smenu');

    var setMenu = function (open) {
      /* data-open pali STARU navigaciju unutar zaglavlja. Kad postoji pun
         meni, ona mora ostati ugasena: inace se njeni linkovi vide preko
         crnog panela i, jos gore, zauzmu mjesto u redu zaglavlja pa
         stisnu dugme za zatvaranje na dvadesetak piksela.
         Izmjereno: dugme je ispadalo kao uska uspravna kapsula. */
      nav.setAttribute('data-open', (open && !document.getElementById('smenu')) ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Zatvorite meni' : 'Otvorite meni');

      if (smenu) {
        smenu.classList.toggle('is-open', open);
        smenu.setAttribute('aria-hidden', open ? 'false' : 'true');
        // Zaglavlje ide iznad menija, inace overlay prekrije dugme i meni
        // se ne moze zatvoriti. Izmjereno prije popravke: drugi klik nije
        // radio nista.
        if (headerEl) { headerEl.classList.toggle('is-over-menu', open); }
      } else if (headerEl) {
        headerEl.setAttribute('data-menu', open ? 'open' : 'closed');
      }

      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('.nav__link, .nav__cta')) { setMenu(false); }
    });

    // Klik na bilo koju stavku u punom meniju ga zatvara.
    if (smenu) {
      smenu.addEventListener('click', function (event) {
        if (event.target.closest('.smenu__item, .smenu__cta, .smenu__social-link')) {
          setMenu(false);
        }
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });

    var desktop = window.matchMedia('(min-width: 810px)');
    var onBreakpoint = function (mq) { if (mq.matches) { setMenu(false); } };
    if (desktop.addEventListener) { desktop.addEventListener('change', onBreakpoint); }
    else if (desktop.addListener) { desktop.addListener(onBreakpoint); }
  }


  /* ------------------------------------------------------------------------
     2. POJAVLJIVANJE NA SKROL
     ------------------------------------------------------------------------ */

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) { return; }

    // Bez IntersectionObservera sadrzaj prosto ostaje vidljiv.
    if (!('IntersectionObserver' in window)) { return; }

    // Stepenasto kasnjenje: svakom djetetu upisi redni broj.
    document.querySelectorAll('[data-reveal-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
    });

    // Tek sada se pali pocetno stanje, da stranica ostane vidljiva bez JS-a.
    document.documentElement.classList.add('js-reveal-ready');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);   // original se ne vraca unazad
      });
    }, {
      // Original koristi threshold 0, pali cim udje ijedan piksel.
      // Odmak odozdo daje mirniji ulazak kod blokova visih od ekrana.
      threshold: 0,
      rootMargin: '0px 0px -8% 0px'
    });

    targets.forEach(function (el) { observer.observe(el); });
  }

  if (!reduceMotion.matches) { initReveal(); }

  // Ako korisnik iskljuci smanjeni pokret u toku sesije, upali animacije.
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function (e) {
      if (!e.matches && !document.documentElement.classList.contains('js-reveal-ready')) {
        initReveal();
      }
    });
  }

})();


/* ==========================================================================
   HERO PO KONSTRI
   --------------------------------------------------------------------------
   Tri stvari, sve tri prepisane iz izvornog koda Konstre:
     1. rolanje natpisa dugmadi po karakteru na hover
     2. ulazne animacije na ucitavanju, sa tacnim odgodama
     3. rotacija tri slike u kartici sa progres trakom

   Bez ijedne biblioteke. Original isto ponasanje dobija uz React,
   Framer Motion i 1.6 MB chunkova.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     1. ROLANJE NATPISA PO KARAKTERU
     ------------------------------------------------------------------------
     Svaki karakter se zamjenjuje elementom visine jednog reda sa overflow
     hidden, u kome stoje DVIJE kopije istog karaktera jedna ispod druge.
     CSS na hover pomjeri kolonu za -50% i druga kopija dodje na mjesto prve.

     Indeks karaktera ide u --i, a CSS iz njega racuna kasnjenje od 30ms
     po karakteru, tacno kao original.

     Radi se iz skripte, ne u HTML-u, da natpis ostane obican citljiv tekst
     ako JavaScript ne ucita, i da citaci ekrana ne dobiju slovo po slovo.
     ------------------------------------------------------------------------ */
  function rollJednu(label) {
      var text = label.textContent;
      if (!text) { return; }

      var frag = document.createDocumentFragment();

      // Pravi natpis ostaje u DOM-u, samo vizuelno sakriven. Sluzi i
      // citacima ekrana i kopiranju teksta sa stranice: bez njega
      // selekcija vrati slovo po slovo u zasebnim redovima, jer je
      // svaki karakter blok element.
      var plain = document.createElement('span');
      plain.className = 'visually-hidden';
      plain.textContent = text;
      frag.appendChild(plain);

      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var cell = document.createElement('span');
        cell.className = 'btn__char';
        cell.setAttribute('aria-hidden', 'true');

        if (ch === ' ') { cell.className += ' btn__char--space'; }

        var inner = document.createElement('span');
        inner.className = 'btn__char-inner';
        inner.style.setProperty('--i', String(i));

        // Dvije identicne kopije: prva se vidi, druga ceka ispod.
        for (var copy = 0; copy < 2; copy++) {
          var glyph = document.createElement('span');
          glyph.textContent = ch === ' ' ? ' ' : ch;
          inner.appendChild(glyph);
        }

        cell.appendChild(inner);
        frag.appendChild(cell);
      }

      label.textContent = '';
      label.appendChild(frag);
  }

  function buildRollingLabels() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-roll]'), rollJednu);
  }

  /* ------------------------------------------------------------------------
     2. NASLOV: RAZBIJANJE NA RIJECI
     ------------------------------------------------------------------------
     Original animira po rijeci, ne po slovu. Svaka rijec dobija svoj indeks
     u --i, a CSS iz njega racuna kasnjenje: 0.7s + 0.05s * indeks.

     Razmaci ostaju izvan span-ova da se prelom reda ponasa normalno.
     ------------------------------------------------------------------------ */
  function splitTitleIntoWords(title) {
    var index = 0;

    /* Rekurzivno, jer naslov nije uvijek ravan tekst.
       Naslov sekcije Usluge izgleda ovako:

         Od ideje do čelika,<br><span class="accent">na jednom mjestu</span>

       Prva verzija je klonirala svaki element kao cjelinu, pa su rijeci
       unutar obojenog span-a ostale nerazbijene i nisu se animirale.
       Izmjereno: 4 rijeci umjesto 6.

       Sada se u elemente ulazi i njihov sadrzaj se razbija na mjestu, a
       sam element (span sa bojom, <br>) ostaje netaknut. */
    function walk(node) {
      var frag = document.createDocumentFragment();

      Array.prototype.forEach.call(node.childNodes, function (child) {
        // Tekst: razbij na rijeci, razmake ostavi kakvi jesu.
        if (child.nodeType === 3) {
          child.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) { return; }

            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }

            var span = document.createElement('span');
            span.className = 'hero__word';
            span.style.setProperty('--i', String(index));
            span.textContent = part;
            frag.appendChild(span);
            index++;
          });
          return;
        }

        // Element bez djece, npr. <br>: prenesi ga kakav jeste.
        if (!child.childNodes.length) {
          frag.appendChild(child.cloneNode(true));
          return;
        }

        // Element sa sadrzajem: zadrzi ga, ali mu razbij unutrasnjost.
        var clone = child.cloneNode(false);
        clone.appendChild(walk(child));
        frag.appendChild(clone);
      });

      return frag;
    }

    var result = walk(title);
    title.textContent = '';
    title.appendChild(result);
  }

  /* ------------------------------------------------------------------------
     3. ULAZNE ANIMACIJE
     ------------------------------------------------------------------------
     Klasa .js-appear ide na <html> tek odavde. Bez nje CSS ne skriva nista,
     pa stranica bez JavaScripta izgleda normalno umjesto da bude prazna.

     Odgode su u CSS-u kao --appear-delay po elementu. Ovdje se samo, u
     sljedecem kadru, upali .is-in i sve krene.
     ------------------------------------------------------------------------ */
  /* ------------------------------------------------------------------------
     KUKA ZA PREVODILAC
     ------------------------------------------------------------------------
     Ovi efekti prepisuju sadrzaj elementa: natpisi dugmadi se razbijaju na
     slova, naslovi na rijeci. Poslije toga tog teksta vise nema kao jednog
     cvora, pa ga js/jezik.js ne moze naci ni zamijeniti.

     Zato se ovdje izlazu po-elementne verzije: prevodilac upise novi tekst
     i element se ponovo rastavi, pa efekat ostaje i na engleskom.
     Svaki modul dodaje svoj kljuc, jer main.js nije jedan doseg.
     ------------------------------------------------------------------------ */
  window.BSTEEL_RESPLIT = window.BSTEEL_RESPLIT || {};

  window.BSTEEL_RESPLIT.roll = function (el, text) {
    el.textContent = text;
    rollJednu(el);
  };

  /* words() NE dira sadrzaj: naslovi imaju <br> i obojene span-ove koje
     splitTitleIntoWords cuva. Prevodilac prvo vrati izvorni innerHTML i
     prevede tekstualne cvorove u njemu, pa pozove ovo da ih rastavi. */
  window.BSTEEL_RESPLIT.words = function (el) {
    var bio = el.classList.contains('is-in');
    splitTitleIntoWords(el);
    if (bio) { el.classList.add('is-in'); }
  };

  function runHeroIntro() {
    // Svi naslovi koji se otkrivaju rijec po rijec, ne samo hero.
    var titles = document.querySelectorAll('[data-split-words]');
    var targets = document.querySelectorAll('[data-appear]');

    if (!titles.length && !targets.length) { return; }

    Array.prototype.forEach.call(titles, splitTitleIntoWords);

    root.classList.add('js-appear');

    // Hero krece odmah po ucitavanju; naslovi sekcija cekaju da udju
    // u kadar. Isti efekat, drugi okidac.
    var heroTitle = document.querySelector('.hero [data-split-words]');
    var later = [];
    Array.prototype.forEach.call(titles, function (t) {
      if (t !== heroTitle) { later.push(t); }
    });

    if (later.length && 'IntersectionObserver' in window) {
      var wordObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          entry.target.classList.add('is-in');
          wordObserver.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

      later.forEach(function (t) { wordObserver.observe(t); });
    } else {
      later.forEach(function (t) { t.classList.add('is-in'); });
    }

    // Dva ugnijezdjena kadra: prvi da pretrazivac primijeni pocetno stanje,
    // drugi da tranzicija stvarno krene. Sa jednim se zna preskociti.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (heroTitle) { heroTitle.classList.add('is-in'); }
        Array.prototype.forEach.call(targets, function (el) {
          el.classList.add('is-in');
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     4. ROTACIJA SLIKA U KARTICI
     ------------------------------------------------------------------------
     Tri slike lezu jedna preko druge, aktivna ima opacity 1.
     Progres traka se puni u koracima od 60ms, tacno kao original
     (u izvoru: transition: width 60ms linear).

     Rotacija stoji dok je kartica pod misem ili dok je stranica u pozadini.
     ------------------------------------------------------------------------ */
  var SLIDE_DURATION = 5000;   // koliko jedna slika stoji
  var TICK = 60;               // korak punjenja trake, iz izvora

  function initSlideshow() {
    var box = document.querySelector('[data-slideshow]');
    if (!box) { return; }

    var slides = box.querySelectorAll('.pcard__slide');
    if (slides.length < 2) { return; }

    var card = box.closest('.pcard');
    var nums = card ? card.querySelectorAll('.pcard__num') : [];
    var fills = card ? card.querySelectorAll('.pcard__fill') : [];
    var veilTitle = card ? card.querySelector('.pcard__title') : null;

    var current = 0;
    var elapsed = 0;
    var paused = false;

    function paint() {
      Array.prototype.forEach.call(slides, function (slide, i) {
        slide.classList.toggle('is-active', i === current);
      });

      Array.prototype.forEach.call(nums, function (num, i) {
        num.classList.toggle('is-active', i === current);
      });

      if (veilTitle) {
        var t = slides[current].getAttribute('data-title');
        if (t) { veilTitle.textContent = t; }
      }
    }

    function paintProgress() {
      // Trake ispred aktivne su pune, traka aktivne se puni, ostale prazne.
      Array.prototype.forEach.call(fills, function (fill, i) {
        if (i < current) { fill.style.width = '100%'; }
        else if (i === current) { fill.style.width = (elapsed / SLIDE_DURATION * 100) + '%'; }
        else { fill.style.width = '0%'; }
      });
    }

    paint();
    paintProgress();

    setInterval(function () {
      if (paused || document.hidden) { return; }

      elapsed += TICK;

      if (elapsed >= SLIDE_DURATION) {
        elapsed = 0;
        current = (current + 1) % slides.length;

        // Pri povratku na prvu sliku trake se resetuju bez animacije,
        // inace bi se vidjelo kako se prazne unazad.
        if (current === 0) {
          Array.prototype.forEach.call(fills, function (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
          });
          // Vracanje tranzicije u sljedecem kadru.
          requestAnimationFrame(function () {
            Array.prototype.forEach.call(fills, function (fill) {
              fill.style.transition = '';
            });
          });
        }

        paint();
      }

      paintProgress();
    }, TICK);

    if (card) {
      card.addEventListener('mouseenter', function () { paused = true; });
      card.addEventListener('mouseleave', function () { paused = false; });
      card.addEventListener('focusin',    function () { paused = true; });
      card.addEventListener('focusout',   function () { paused = false; });
    }
  }

  // Rolanje natpisa ide uvijek: to je hover efekat, a CSS ga sam gasi
  // kada korisnik trazi manje pokreta.
  buildRollingLabels();


  if (reduceMotion.matches) {
    // Bez ulaznih animacija, ali slike se i dalje smjenjuju.
    initSlideshow();
  } else {
    runHeroIntro();
    initSlideshow();
  }

})();


/* ==========================================================================
   ZAGLAVLJE NA SKROL  +  GLATKO SKROLOVANJE
   --------------------------------------------------------------------------
   Oboje je prepisano iz izvora Konstre.

   1. Zaglavlje
      scrollDirection { direction: "down", target: { y: -200 } }
      transition      { type: spring, bounce: 0, delay: 0.2, duration: 0.6 }
      Sam pomak i tajming su u CSS-u; ovdje se samo prepoznaje smjer.

   2. Glatko skrolovanje
      Konstra ucitava SmoothScroll_Prod chunk, koji je Lenis. Iz njega:
        lerp 0.1,  damp(trenutno, cilj, 60 * lerp, dt)
      To je eksponencijalno prigusenje sa faktorom 6 po sekundi, nezavisno
      od broja kadrova. Ista formula je prepisana ovdje, bez biblioteke.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     1. ZAGLAVLJE SE KRIJE NA SKROL NADOLJE
     ------------------------------------------------------------------------ */
  function initHeaderOnScroll() {
    var header = document.getElementById('header');
    if (!header) { return; }

    var last = window.scrollY;
    var ticking = false;

    // Prag: ispod ove visine se ne krije, da zaglavlje ne nestane
    // odmah na prvi pomak dok je hero jos u kadru.
    var TOP_ZONE = 120;
    // Mrtva zona, da sitno podrhtavanje ne okrece stanje.
    var MIN_DELTA = 8;
    // Prag za crnu pozadinu. Original ima threshold 0.5 na bloku od
    // 88px, dakle 44px, i cim se to predje zaglavlje prelazi na
    // varijantu "Desktop (BG Black)".
    var BG_ZONE = 44;

    function paintBackground(y) {
      header.setAttribute('data-scrolled', y > BG_ZONE ? 'true' : 'false');
    }

    function update() {
      ticking = false;
      var y = window.scrollY;
      var diff = y - last;

      // Pozadina se prebacuje uvijek, i pri sitnim pomacima, jer je
      // vezana za polozaj a ne za smjer.
      paintBackground(y);

      if (Math.abs(diff) < MIN_DELTA) { return; }
      last = y;

      // Otvoren meni ne dira zaglavlje.
      if (header.getAttribute('data-menu') === 'open') { return; }

      if (y <= TOP_ZONE) {
        header.setAttribute('data-hidden', 'false');
        return;
      }

      header.setAttribute('data-hidden', diff > 0 ? 'true' : 'false');
    }

    // Pocetno stanje: stranica moze da se ucita i na sredini (npr. sidro
    // u adresi ili povratak na prethodnu poziciju).
    paintBackground(window.scrollY);

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     2. GLATKO SKROLOVANJE
     ------------------------------------------------------------------------
     Pali se samo na misu. Na dodir se NE dira nista: telefoni i tableti
     imaju svoje inercijalno skrolovanje koje je bolje od svakog koje bi
     se ovdje napisalo, a presretanje dodira lomi i pull-to-refresh.

     Formula je Lenisova, iz SmoothScroll chunka:
       trenutno = trenutno + (cilj - trenutno) * (1 - exp(-6 * dt))
     Faktor 6 je 60 * lerp, gdje je lerp 0.1 kao na Konstri. Posto ulazi
     stvarno proteklo vrijeme, brzina je ista i na 60 i na 144 Hz.
     ------------------------------------------------------------------------ */
  var LERP = 0.1;
  var LINE_HEIGHT = 100 / 6;   // Lenis: DOM_DELTA_LINE se mnozi ovim

  function initSmoothScroll() {
    var root = document.documentElement;

    /* OVO JE OBAVEZNO, ne kozmetika.
       CSS ima html { scroll-behavior: smooth }. Bez ove linije browser
       dodatno animira SVAKI nas scrollTo, a mi ga zovemo 60 puta u
       sekundi. Dvije animacije se bore, skrol se zaglavljuje i kasni.
       Od trenutka kad glatko skrolovanje preuzmemo mi, nativno se gasi. */
    root.style.scrollBehavior = 'auto';

    var target = window.scrollY;
    var current = target;
    var running = false;
    var lastTime = 0;
    // Dok skripta sama pomjera stranicu, ignorise svoj scroll dogadjaj.
    var selfScrolling = false;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function frame(now) {
      var dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      current += (target - current) * (1 - Math.exp(-60 * LERP * dt));

      if (Math.abs(target - current) < 0.4) {
        current = target;
        running = false;
      }

      selfScrolling = true;
      window.scrollTo(0, current);
      selfScrolling = false;

      if (running) { requestAnimationFrame(frame); }
    }

    function start() {
      if (running) { return; }
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }

    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey) { return; }           // zumiranje se ne dira
      if (e.defaultPrevented) { return; }

      var delta = e.deltaY;
      if (e.deltaMode === 1) { delta *= LINE_HEIGHT; }
      else if (e.deltaMode === 2) { delta *= window.innerHeight; }

      e.preventDefault();
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      start();
    }, { passive: false });

    // Svaki drugi nacin pomjeranja (tastatura, sidra, trazenje po
    // stranici, traka za skrolovanje) samo vrati cilj na stvarni polozaj.
    window.addEventListener('scroll', function () {
      if (selfScrolling || running) { return; }
      target = current = window.scrollY;
    }, { passive: true });

    window.addEventListener('resize', function () {
      target = current = window.scrollY;
    });

    /* Sidra. Posto je nativno glatko skrolovanje ugaseno, klik na
       #sekciju bi inace skocio trenutno. Zato se odrediste racuna ovdje
       i pusta kroz istu krivu, umanjeno za visinu zaglavlja da naslov
       ne zavrsi ispod njega. */
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) { return; }

      var id = link.getAttribute('href');
      if (!id || id === '#') { return; }

      var dest = document.querySelector(id);
      if (!dest) { return; }

      var header = document.getElementById('header');
      var offset = header ? header.offsetHeight + 16 : 0;

      e.preventDefault();
      target = Math.max(0, Math.min(
        maxScroll(),
        dest.getBoundingClientRect().top + window.scrollY - offset
      ));
      start();

      // Fokus mora da prati skrol, inace tastatura ostaje na starom mjestu.
      if (!dest.hasAttribute('tabindex')) { dest.setAttribute('tabindex', '-1'); }
      dest.focus({ preventScroll: true });

      if (history.replaceState) { history.replaceState(null, '', id); }
    });
  }

  /* ------------------------------------------------------------------------
     3. HERO SE POMJERA SPORIJE OD STRANICE
     ------------------------------------------------------------------------
     Izmjereno na zivom Konstra sajtu, na sest polozaja skrola. Odnos je
     svuda isti do na tri decimale:

       scrollY  200  ->  hero na -120   (0.60)
       scrollY  450  ->  hero na -270   (0.60)
       scrollY  900  ->  hero na -540   (0.60)
       scrollY 1100  ->  hero na -660   (0.60)

     Element dobija translateY = 0.4 * scrollY, pa se vidljivo krece 0.6
     brzine stranice. Linearno, bez ublazavanja. Sljedeca sekcija ide
     1:1 i, posto je neprovidna i iznad njega, djeluje kao da ga navlaci
     preko sebe.

     Racun se gasi cim hero prodje svoju visinu: od tada ga sekcija
     ispod potpuno prekriva, pa nema sta da se pomjera.
     ------------------------------------------------------------------------ */
  function initHeroParallax() {
    var hero = document.querySelector('.hero');
    if (!hero) { return; }

    var factor = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-parallax')
    ) || 0.4;

    var ticking = false;
    var applied = -1;

    function paint() {
      ticking = false;
      var h = hero.offsetHeight;
      var y = Math.min(window.scrollY, h);
      var shift = Math.round(y * factor);

      if (shift === applied) { return; }
      applied = shift;
      hero.style.transform = 'translate3d(0, ' + shift + 'px, 0)';
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    paint();
  }

  /* ------------------------------------------------------------------------
     4. NASLOV SE POPUNJAVA PRI SKROLOVANJU
     ------------------------------------------------------------------------
     Iz izvora Konstre, komponenta se dijeli na rijeci pa na slova, i
     svako slovo dobija svoj dio opsega skrola:

       opseg     od kad vrh elementa dodje na 70% visine ekrana do 30%
                 (u izvoru: offset ["start 0.7", "start 0.3"])
       po slovu  [i/n, (i+1)/n] unutar tog opsega
       opacity   0.2 -> 1
       boja      #BAB3A2 -> #FCF6E9

     Nema ni zamucenja ni pomaka, samo prozirnost i boja. Zato je jeftino.

     Skripta upisuje samo --t po slovu, a CSS iz njega racuna i prozirnost
     i boju. Pise se samo kad se vrijednost stvarno promijeni, pa se kod
     mirovanja ne dira DOM.
     ------------------------------------------------------------------------ */
  /* Lista je u dosegu modula, ne u funkciji, da prevodilac moze da zamijeni
     jedan blok novim tekstom i da ga paint odmah vidi. */
  var fillItems = [];

  function fillJedan(block) {
      var text = block.textContent.trim();
      if (!text) { return; }

      var frag = document.createDocumentFragment();
      var chars = [];

      text.split(/\s+/).forEach(function (word, wi, all) {
        var w = document.createElement('span');
        w.className = 'fill-word';

        word.split('').forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'fill-char';
          c.textContent = ch;
          w.appendChild(c);
          chars.push(c);
        });

        frag.appendChild(w);
        // Razmak stoji IZMEDJU rijeci, da se prelom reda ponasa normalno.
        if (wi < all.length - 1) { frag.appendChild(document.createTextNode(' ')); }
      });

      block.textContent = '';
      block.appendChild(frag);
      var item = { el: block, chars: chars, last: [] };
      for (var k = 0; k < fillItems.length; k++) {
        if (fillItems[k].el === block) { fillItems[k] = item; return; }
      }
      fillItems.push(item);
  }

  function initScrollFill() {
    var blocks = document.querySelectorAll('[data-scroll-fill]');
    if (!blocks.length) { return; }

    Array.prototype.forEach.call(blocks, fillJedan);

    document.documentElement.classList.add('js-scroll-fill');

    var ticking = false;

    function paint() {
      ticking = false;
      var vh = window.innerHeight;

      fillItems.forEach(function (item) {
        var top = item.el.getBoundingClientRect().top;

        // 0 kad je vrh na 70% ekrana, 1 kad dodje na 30%.
        var p = (0.7 * vh - top) / (0.4 * vh);
        p = Math.max(0, Math.min(1, p));

        var n = item.chars.length;

        for (var i = 0; i < n; i++) {
          var start = i / n;
          var t = (p - start) * n;
          t = Math.max(0, Math.min(1, t));

          // Dvije decimale su dovoljne, a dese puta manje upisa u DOM.
          var rounded = Math.round(t * 100) / 100;
          if (item.last[i] === rounded) { continue; }
          item.last[i] = rounded;
          item.chars[i].style.setProperty('--t', rounded);
        }
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    window.addEventListener('resize', paint);
    paint();
  }

  /* ------------------------------------------------------------------------
     5. KARTICE USLUGA SE SMANJUJU DOK IH SLJEDECA PREKRIVA
     ------------------------------------------------------------------------
     Lijepljenje na 120px radi CSS. Ovo je drugi dio efekta: kartica koja
     je prekrivena postepeno se smanjuje, pa se stek cita kao spil karata
     koji se povlaci u dubinu.

     Izmjereno na zivoj Konstri, na omotacu sa position: sticky. Prvo
     mjerenje mi je promaklo jer sam gledao samo samu karticu, a
     transform stoji na omotacu, i to kao matrix3d:

       scrollY 2400  ->  scale 1.0000
       scrollY 2700  ->  scale 0.8696
       scrollY 2900  ->  scale 0.8071
       scrollY 3000  ->  scale 0.7499
       scrollY 3300  ->  scale 0.7230
       scrollY 3600  ->  scale 0.7010

     Uklopljeno: linearno od 1.0 do 0.70, preko raspona od DVA slota
     kartice (2 x 590px), racunato od trenutka kad se kartica zalijepi.
     Provjera modela na istim tackama: 0.860 / 0.809 / 0.784 / 0.707 /
     0.700. Poklapa se u drugoj decimali svuda osim na jednoj tacki.

     Zadnja kartica se NE smanjuje: nju nista ne prekriva, pa bi to
     izgledalo kao greska. Original tu tacku nije ni dosegao u mjerenju.
     ------------------------------------------------------------------------ */
  var CARD_MIN_SCALE = 0.70;
  var CARD_SPAN_SLOTS = 2;

  function initCardStack() {
    var list = document.querySelector('.svcs__list');
    if (!list) { return; }

    var cards = Array.prototype.slice.call(list.querySelectorAll('.svc'));
    if (cards.length < 2) { return; }

    /* Tacka lijepljenja se cita sa same kartice, ne iz tokena, jer nije
       ista na svim sirinama: 120px na desktopu, 16px ispod 1440px. Token
       ostaje rezerva ako top iz nekog razloga nije broj. */
    var citajTop = function () {
      var t = parseFloat(getComputedStyle(cards[0]).top);
      if (!isNaN(t)) { return t; }
      return parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--card-stack-top')
      ) || 120;
    };
    var stackTop = citajTop();

    /* Skaliranje ide tacno tamo gdje ide i lijepljenje. Umjesto medija
       upita se cita STVARNO stanje prve kartice: na stranici Usluge je
       position: static ispod 810px (.svcs--lista), pa se skaliranje tamo
       samo iskljuci, a na pocetnoj radi i na telefonu. */
    var wide = {
      get matches() {
        return getComputedStyle(cards[0]).position === 'sticky';
      }
    };

    var ticking = false;
    var applied = [];

    function paint() {
      ticking = false;

      if (!wide.matches) {
        cards.forEach(function (c, i) {
          if (applied[i] !== null) { c.style.transform = ''; applied[i] = null; }
        });
        return;
      }

      /* ZAMKA, i to ona koja me je dvaput prevarila:
         offsetTop kod sticky elementa u Chrome-u prati ZALIJEPLJENI
         polozaj, ne onaj u toku. Izmjereno: prva kartica je u mirovanju
         na 2270, a cim se zalijepi njen offsetTop skoci na 2850, pa je
         pomak ispadao nula ili negativan i skaliranje se nikad nije
         upalilo.

         Zato se mjeri samo LISTA, koja nije sticky pa je stabilna, a
         polozaj svake kartice se sabira iz visina, sto sticky ne dira. */
      var listTop = 0;
      var node = list;
      while (node) { listTop += node.offsetTop; node = node.offsetParent; }

      var gap = parseFloat(getComputedStyle(list).rowGap) || 32;
      var span = (cards[0].offsetHeight + gap) * CARD_SPAN_SLOTS;
      var acc = listTop;

      cards.forEach(function (card, i) {
        var stickStart = acc - stackTop;
        acc += card.offsetHeight + gap;

        // Zadnju nista ne prekriva.
        if (i === cards.length - 1) { return; }

        var t = (window.scrollY - stickStart) / span;
        t = Math.max(0, Math.min(1, t));

        var scale = 1 - (1 - CARD_MIN_SCALE) * t;
        var rounded = Math.round(scale * 1000) / 1000;

        if (applied[i] === rounded) { return; }
        applied[i] = rounded;

        // Na skali 1 se stil brise, da ulazna animacija i dalje moze
        // da koristi svoj transform.
        card.style.transform = rounded === 1 ? '' : 'scale(' + rounded + ')';
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    // Na promjenu sirine se mijenja i tacka lijepljenja, pa se ocitava opet.
    window.addEventListener('resize', function () { stackTop = citajTop(); applied = []; paint(); });
    paint();
  }

  /* ------------------------------------------------------------------------
     MISSION: POZADINA SE ZAMUCUJE, KARTICE SE SMJENJUJU
     ------------------------------------------------------------------------
     Po Konstrinoj /about. Tamo je to Framerov "controlled timeline" vezan
     za skrol; ovdje isti odnos kroz obican scroll listener.

     Slika je sticky i stoji dok prodje .msn__rail (1478px, koliko i na
     originalu). Kroz tu duzinu:
       zamucenje  0 -> 10px, izmedju 5% i 45% puta
       kartice    prva izlazi na 28-42%, druga ulazi na 32-46%

     Zamucenje se zaokruzuje na cetvrtinu piksela i preskace ako se nije
     promijenilo, jer je filter na slici preko cijelog ekrana skup.
     ------------------------------------------------------------------------ */
  var MSN_BLUR_MAX = 10;

  function initMission() {
    var sec = document.querySelector('.msn');
    if (!sec) { return; }

    var stage = sec.querySelector('.msn__stage');
    var bg = sec.querySelector('.msn__bg');
    var cards = Array.prototype.slice.call(sec.querySelectorAll('[data-msn-card]'));
    if (!stage || !bg || cards.length < 2) { return; }

    var ticking = false;
    var zadnjiBlur = -1;

    function odsjecak(t, od, do_) {
      return Math.max(0, Math.min(1, (t - od) / (do_ - od)));
    }

    function paint() {
      ticking = false;

      // Ispod 1024px je sekcija obicna kolona, bez lijepljenja i smjene.
      if (getComputedStyle(stage).position !== 'sticky') {
        if (zadnjiBlur !== null) {
          bg.style.filter = '';
          cards.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; c.style.pointerEvents = ''; });
          zadnjiBlur = null;
        }
        return;
      }

      var top = 0, node = sec;
      while (node) { top += node.offsetTop; node = node.offsetParent; }

      var span = sec.offsetHeight - stage.offsetHeight;
      if (span <= 0) { return; }

      var t = Math.max(0, Math.min(1, (window.scrollY - top) / span));

      var blur = Math.round(MSN_BLUR_MAX * odsjecak(t, 0.05, 0.45) * 4) / 4;
      if (blur !== zadnjiBlur) {
        zadnjiBlur = blur;
        bg.style.filter = blur ? 'blur(' + blur + 'px)' : '';
      }

      var izlaz = odsjecak(t, 0.28, 0.42);
      var ulaz = odsjecak(t, 0.32, 0.46);

      cards[0].style.opacity = String(1 - izlaz);
      cards[0].style.transform = 'translate(-50%, calc(-50% - ' + (izlaz * 24).toFixed(1) + 'px))';
      cards[0].style.pointerEvents = izlaz > 0.5 ? 'none' : '';

      cards[1].style.opacity = String(ulaz);
      cards[1].style.transform = 'translate(-50%, calc(-50% + ' + ((1 - ulaz) * 24).toFixed(1) + 'px))';
      cards[1].style.pointerEvents = ulaz > 0.5 ? '' : 'none';
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    window.addEventListener('resize', function () { zadnjiBlur = -1; paint(); });
    paint();
  }

  /* ------------------------------------------------------------------------
     CORE VALUE: LENJIRI SE SKUPLJAJU, TEKST SE PODIZE
     ------------------------------------------------------------------------
     Konstra drzi naslov i cetiri kolone zalijepljene, pa kroz cetiri
     odsjecka od po 496px skuplja lenjir svake kolone sa 254 na 133px.
     Tekst ispod nije animiran zasebno; on se podigne sam, jer je lenjir
     u istom stubu i nosi visinu.

     Kolona i dobija svoj cetvrtinski dio puta: t = clamp(p*4 - i, 0, 1).
     ------------------------------------------------------------------------ */
  var CVAL_RULE_MAX = 254;
  var CVAL_RULE_MIN = 133;

  function initCoreValues() {
    var sec = document.querySelector('.cvals');
    if (!sec) { return; }

    var stage = sec.querySelector('.cvals__sticky');
    var rules = Array.prototype.slice.call(sec.querySelectorAll('.cval__rule'));
    if (!stage || !rules.length) { return; }

    var ticking = false;
    var applied = [];

    function paint() {
      ticking = false;

      if (getComputedStyle(stage).position !== 'sticky') {
        rules.forEach(function (r, i) {
          if (applied[i] !== null) { r.style.height = ''; applied[i] = null; }
        });
        return;
      }

      var top = 0, node = sec;
      while (node) { top += node.offsetTop; node = node.offsetParent; }

      var span = sec.offsetHeight - stage.offsetHeight;
      if (span <= 0) { return; }

      var p = Math.max(0, Math.min(1, (window.scrollY - top) / span));

      rules.forEach(function (r, i) {
        var t = Math.max(0, Math.min(1, p * rules.length - i));
        var h = Math.round(CVAL_RULE_MAX - (CVAL_RULE_MAX - CVAL_RULE_MIN) * t);
        if (applied[i] === h) { return; }
        applied[i] = h;
        r.style.height = h + 'px';
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    window.addEventListener('resize', function () { applied = []; paint(); });
    paint();
  }

  /* ------------------------------------------------------------------------
     PRAVILA KAO SLIDER NA TELEFONU
     ------------------------------------------------------------------------
     Ispod 810px .cvals__row je traka sa scroll-snapom umjesto mreze. Dvije
     okrugle strelice je pomjeraju za jednu kolonu, kao na Konstri.
     Skripta ne dira izgled: ako traka nije prelivajuca (desktop), dugmad
     su ionako sakrivena CSS-om i nista se ne desava.
     ------------------------------------------------------------------------ */
  function initCvalsSlider() {
    var traka = document.querySelector('.cvals__row');
    if (!traka) { return; }

    var prev = document.querySelector('[data-cvals-prev]');
    var next = document.querySelector('[data-cvals-next]');
    if (!prev || !next) { return; }

    function korak() {
      var prva = traka.querySelector('.cval');
      if (!prva) { return traka.clientWidth; }
      var gap = parseFloat(getComputedStyle(traka).columnGap) || 0;
      return prva.offsetWidth + gap;
    }

    /* Pocetak trake NIJE scrollLeft 0. Traka ima padding s lijeve strane i
       scroll-snap, pa se pri ucitavanju parkira na tom paddingu, izmjereno
       16px na 390px ekranu. Sa provjerom <= 0 lijeva strelica nikad ne bi
       ispala ugasena, iako klik na nju ne radi nista. Zato se pocetak cita
       iz stvarnog polozaja prve kartice u traci. */
    function pocetak() {
      var prva = traka.querySelector('.cval');
      return prva ? prva.offsetLeft - traka.offsetLeft : 0;
    }

    function osvjezi() {
      var kraj = traka.scrollWidth - traka.clientWidth - 1;
      prev.disabled = traka.scrollLeft <= pocetak() + 1;
      next.disabled = traka.scrollLeft >= kraj;
    }

    prev.addEventListener('click', function () { traka.scrollBy({ left: -korak(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { traka.scrollBy({ left: korak(), behavior: 'smooth' }); });

    var ticking = false;
    traka.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(function () { ticking = false; osvjezi(); });
    }, { passive: true });

    window.addEventListener('resize', osvjezi);
    osvjezi();
  }


  /* ------------------------------------------------------------------------
     6. BROJANJE OD NULE DO VRIJEDNOSTI
     ------------------------------------------------------------------------
     Pali se SAMO na elementima koji imaju stvaran broj u data-count-to.
     Kartice koje jos cekaju podatak od firme nose prazan atribut i
     ostaju netaknute, sa vidljivim [DOPUNITI: X].

     Zato se ne provjerava postojanje atributa nego da li je vrijednost
     broj. Prazan string bi kroz Number() dao nulu, pa bi kartica
     odbrojavala do nule i izgledala kao greska.

     Krece kad blok udje u kadar, jednom, i koristi istu krivu kao
     ostatak sajta. Broj se u medjuvremenu ne smije citati naglas, pa
     citac ekrana dobija gotovu vrijednost preko aria-label.
     ------------------------------------------------------------------------ */
  var COUNT_DURATION = 1200;

  function initCountUp() {
    var nodes = document.querySelectorAll('.js-count[data-count-to]');
    if (!nodes.length) { return; }

    var live = [];
    Array.prototype.forEach.call(nodes, function (el) {
      var raw = (el.getAttribute('data-count-to') || '').trim();
      if (raw === '' || isNaN(Number(raw))) { return; }
      live.push({ el: el, to: Number(raw), suffix: el.textContent.replace(raw, '').trim() });
    });

    if (!live.length) { return; }

    // Bez smanjenog pokreta i bez observera broj prosto stoji upisan.
    if (reduceMotion.matches || !('IntersectionObserver' in window)) { return; }

    live.forEach(function (item) {
      item.el.setAttribute('aria-label', item.to + (item.suffix || ''));
      item.el.textContent = '0' + (item.suffix || '');
    });

    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

    function run(item) {
      var start = null;
      function step(now) {
        if (start === null) { start = now; }
        var t = Math.min((now - start) / COUNT_DURATION, 1);
        item.el.textContent = Math.round(ease(t) * item.to) + (item.suffix || '');
        if (t < 1) { requestAnimationFrame(step); }
      }
      requestAnimationFrame(step);
    }

    /* Brojevi u traci rezultata stoje IZA fotografije dok se ona ne
       otkrije. Da im je okidac obicno ulazenje u kadar, odbrojali bi
       dok su jos sakriveni i korisnik ih nikad ne bi vidio kako rastu.
       Zato ti cekaju da traka dobije data-flipped, sto skripta za
       otkrivanje upise kad predje pola puta. */
    var strip = document.querySelector('[data-card-flip]');
    var inStrip = [];
    var rest = [];

    /* Cekanje na data-flipped vazi SAMO tamo gdje rig stvarno radi.
       Ispod 1440px CSS gasi lica (display:none) pa nema sta da pokriva
       brojeve, a initCardFlip se iskljucuje i nikad ne upise data-flipped.
       Cekanje bi tu bilo vjecno.

       Izmjereno prije popravke, poslije punog skrola kroz stranicu i tri
       sekunde cekanja: na 1200, 1000 i 375 brojevi su stajali "0+", "0",
       "0". Sajt je dakle na telefonu i tabletu tvrdio da je firma
       zavrsila nula projekata i da ima nula godina iskustva, dok je na
       1440 sve bilo ispravno. Tamo gdje rig ne radi, brojevi idu na
       obican ulazak u kadar, kao svi ostali. */
    var rigActive = !!strip && window.matchMedia('(min-width: 1440px)').matches;

    live.forEach(function (item) {
      if (rigActive && strip.contains(item.el)) { inStrip.push(item); }
      else { rest.push(item); }
    });

    if (inStrip.length) {
      if (strip.getAttribute('data-flipped') === 'true') {
        inStrip.forEach(run);
      } else if (window.MutationObserver) {
        var mo = new MutationObserver(function () {
          if (strip.getAttribute('data-flipped') !== 'true') { return; }
          mo.disconnect();
          inStrip.forEach(run);
        });
        mo.observe(strip, { attributes: true, attributeFilter: ['data-flipped'] });
      } else {
        inStrip.forEach(run);
      }
    }

    if (!rest.length) { return; }
    live = rest;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        observer.unobserve(entry.target);

        var item = null;
        for (var i = 0; i < live.length; i++) {
          if (live[i].el === entry.target) { item = live[i]; break; }
        }
        if (!item) { return; }

        var start = null;
        function step(now) {
          if (start === null) { start = now; }
          var t = Math.min((now - start) / COUNT_DURATION, 1);
          var value = Math.round(ease(t) * item.to);
          item.el.textContent = value + (item.suffix || '');
          if (t < 1) { requestAnimationFrame(step); }
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0, rootMargin: '0px 0px -15% 0px' });

    live.forEach(function (item) { observer.observe(item.el); });
  }

  /* ------------------------------------------------------------------------
     7. TRAKA REZULTATA: SLIKA SE OTKRIVA U TRI KARTICE
     ------------------------------------------------------------------------
     Izmjereno na zivoj Konstri, i to tek iz treceg pokusaja jer sam prva
     dva puta gledao pogresne elemente.

     Sve tri kartice nose ISTU sliku, renderovanu na punu sirinu trake
     (1296x408), a svaka je siroka 432px sa overflow: hidden. Zato traka
     na pocetku izgleda kao jedna neprekinuta fotografija.

     Zatim lice isklizne za tacno jednu visinu kartice, naizmjenicno:

       off 1200  ->  pomak lica    0     0     0
       off 1250  ->  pomak lica -373  +373  -373
       off 1300  ->  pomak lica -407  +407  -407
       off 1350  ->  pomak lica -408  +408  -408

     Dakle gore / dolje / gore, sve tri istovremeno, kroz oko 100px
     skrola. Ostro, ne razvuceno.

     Kod nas je zalet vezan za visinu ekrana umjesto fiksnih 2996px, pa
     radi i na niskim laptopima. Prozor otkrivanja je 45% do 62% zaleta:
     prije toga se cita fotografija, poslije se citaju brojevi.
     ------------------------------------------------------------------------ */
  /* Pragovi u zaletu, kao dio od 0 do 1.
     Konstra razdvaja kartice odmah po dolasku na mjesto, a lica otkriva
     tek poslije duge pauze. Kod nas je pauza kraca, jer je i cijeli
     zalet upola kraci. */
  var SPLIT_AT = 0.10;
  var OPEN_AT = 0.42;

  function initCardFlip() {
    var strip = document.querySelector('[data-card-flip]');
    if (!strip) { return; }

    var rig = strip.closest('.metrics__rig');
    var sticky = strip.closest('.metrics__sticky');
    if (!rig || !sticky) { return; }

    if (!strip.querySelector('.metric__face')) { return; }

    var wide = window.matchMedia('(min-width: 1440px)');

    // Klasa ide na <html> tek odavde. Bez skripte lice se ne prikazuje
    // uopste, pa kartice odmah stoje sa citljivim podacima.
    document.documentElement.classList.add('js-card-flip');

    var ticking = false;
    var state = '';

    function paint() {
      ticking = false;

      if (!wide.matches) {
        if (state !== 'off') {
          strip.classList.remove('is-split', 'is-open');
          state = 'off';
        }
        return;
      }

      var runway = rig.offsetHeight - sticky.offsetHeight;
      if (runway <= 0) { return; }

      var p = (window.scrollY - (rig.getBoundingClientRect().top + window.scrollY)) / runway;
      p = Math.max(0, Math.min(1, p));

      var next = p >= OPEN_AT ? 'open' : (p >= SPLIT_AT ? 'split' : 'closed');
      if (next === state) { return; }
      state = next;

      strip.classList.toggle('is-split', next !== 'closed');
      strip.classList.toggle('is-open', next === 'open');

      // Brojanje krece tek kad se lica otvore, ne prije: dotle su
      // brojevi iza fotografije pa se rast ne bi ni vidio.
      if (next === 'open') { strip.setAttribute('data-flipped', 'true'); }
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    window.addEventListener('resize', function () { state = ''; paint(); });
    paint();
  }

  /* ------------------------------------------------------------------------
     7.0 KARTICA LOKACIJE
     ------------------------------------------------------------------------
     Otvara se i zatvara na klik. Sve sto se pomjera je u CSS-u, vezano za
     aria-expanded, pa je ovdje samo prebacivanje tog atributa. Time stanje
     istovremeno vidi i citac ekrana, bez ijedne dodatne oznake.
     Nagib za misem radi kroz zajednicki initTilt, jer kartica nosi data-tilt.
     ------------------------------------------------------------------------ */
  function initLocMap() {
    var karta = document.querySelector('.locmap');
    if (!karta) { return; }

    var dugme = karta.querySelector('.locmap__toggle');
    if (!dugme) { return; }

    dugme.addEventListener('click', function () {
      var otvoreno = dugme.getAttribute('aria-expanded') === 'true';
      dugme.setAttribute('aria-expanded', otvoreno ? 'false' : 'true');
      dugme.setAttribute('aria-label', otvoreno ? 'Uvećajte kartu lokacije' : 'Smanjite kartu lokacije');
      karta.classList.toggle('is-open', !otvoreno);
    });
  }

  /* ------------------------------------------------------------------------
     7.a SLAJDER U SEKCIJI RADOVI  (samo telefon)
     ------------------------------------------------------------------------
     Na telefonu je lista radova vodoravni slajder sa scroll-snap. Strelice
     pomjeraju za tacno jednu karticu, racunato iz stvarne sirine kartice i
     razmaka, ne iz pretpostavke.

     Bez skripte slajder i dalje radi prstom, jer je klizanje cist CSS;
     strelice su samo dodatak. Zato se i gase ako nema sta da se pomjera.
     ------------------------------------------------------------------------ */
  function initWorksSlider() {
    var nav = document.querySelector('[data-works-nav]');
    var lista = document.getElementById('radovi-lista');
    if (!nav || !lista) { return; }

    var strelice = nav.querySelectorAll('.works__arrow');

    var korak = function () {
      var k = lista.querySelector('.work');
      if (!k) { return lista.clientWidth; }
      var razmak = parseFloat(getComputedStyle(lista).columnGap) || 0;
      return k.getBoundingClientRect().width + razmak;
    };

    var osvjezi = function () {
      var maks = lista.scrollWidth - lista.clientWidth;
      // Ako nema preliva, slajder je van snage (desktop), pa strelice ne rade.
      Array.prototype.forEach.call(strelice, function (b) {
        var d = Number(b.getAttribute('data-dir'));
        var kraj = d < 0 ? lista.scrollLeft <= 1 : lista.scrollLeft >= maks - 1;
        if (maks <= 1 || kraj) { b.setAttribute('disabled', ''); }
        else { b.removeAttribute('disabled'); }
      });
    };

    Array.prototype.forEach.call(strelice, function (b) {
      b.addEventListener('click', function () {
        lista.scrollBy({ left: Number(b.getAttribute('data-dir')) * korak(), behavior: 'smooth' });
      });
    });

    var ticking = false;
    lista.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; osvjezi(); });
    }, { passive: true });

    window.addEventListener('resize', osvjezi);
    osvjezi();
  }

  /* ------------------------------------------------------------------------
     7.b TRAKA U SEKCIJI "KAKO RADIMO"
     ------------------------------------------------------------------------
     Vertikalna linija uz svaki korak se crta kako se skroluje.

     Izmjereno na zivoj Konstri, uzorak na svakih 50px, ekran 1920x1000,
     na sve cetiri trake:

       popuna krene   kad vrh trake dodje na 0.506 visine ekrana
       popuna je puna kad vrh trake dodje na 0.322 visine ekrana
       prozor         184px skrola, a to je 0.655 visine jednog koraka

     Odatle dvije konstante ispod, zaokruzene na 0.50 i 0.65. Model je
     provjeren unazad: predvidjeni pocetak crtanja za sve cetiri trake
     poklopio se sa izmjerenim u pikselu (7066 / 7355 / 7644 i prva 6777).

     Konstra ovo radi pomjeranjem bloka fiksne visine 247px sa top:-374px
     unutar trake od 239px. Te brojke vaze samo za NJENU visinu koraka, pa
     su kod nas prepisane u procente: popuna stoji tacno jednu visinu trake
     iznad nje i spusta se za 101% svoje visine. Efekat je isti, a radi na
     bilo kojoj visini koraka.

     Klasa .js-rail ide na <html> ODAVDE. Bez skripte i uz smanjen pokret
     linija ostaje nacrtana, sekcija se ne raspada.
     ------------------------------------------------------------------------ */
  var RAIL_START = 0.50;   /* vrh trake na pola ekrana */
  var RAIL_SPAN  = 0.65;   /* pa jos 65% visine koraka skrola do pune trake */

  /* Ulazak stavke. Izmjereno na Konstri na svih pet stavki: pomak krece
     kad vrh stavke dodje na 1030 do 1055px pri ekranu visine 1000, dakle
     tik ispod donje ivice kadra.

     Zajednicki posmatrac na sajtu okida na -8% od dna, sto je 120px
     kasnije, pa bi stavka bila vec upola u kadru prije nego sto krene.
     Zato se ovdje okida iz istog prolaza koji vec racuna traku. Kad se
     skroluje nadolje ovo uvijek stigne prije zajednickog posmatraca, pa
     se njih dvoje ne bore: ko prvi doda klasu, drugi nema sta da radi. */
  var STEP_ENTER = 1.04;

  function initProcessRail() {
    var rails = document.querySelectorAll('.phase__rail');
    var steps = document.querySelectorAll('.phase');
    if (!rails.length && !steps.length) { return; }

    document.documentElement.classList.add('js-rail');

    var items = Array.prototype.map.call(rails, function (rail) {
      return { rail: rail, step: rail.closest('.phase') };
    });

    var ticking = false;

    function paint() {
      ticking = false;
      var vh = window.innerHeight;

      Array.prototype.forEach.call(steps, function (step) {
        if (step.classList.contains('is-revealed')) { return; }
        if (step.getBoundingClientRect().top <= STEP_ENTER * vh) {
          step.classList.add('is-revealed');
        }
      });

      items.forEach(function (it) {
        if (!it.step) { return; }

        var span = it.step.offsetHeight * RAIL_SPAN;
        if (span <= 0) { return; }

        var p = (RAIL_START * vh - it.rail.getBoundingClientRect().top) / span;
        p = Math.max(0, Math.min(1, p));

        it.rail.style.setProperty('--p', p.toFixed(4));
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(paint);
    }, { passive: true });

    window.addEventListener('resize', paint);
    paint();
  }

  /* ------------------------------------------------------------------------
     7.c NAGIB STAKLENE KARTICE
     ------------------------------------------------------------------------
     Kartica oko obrasca se blago naginje za misem. Iz trazene komponente:

       rotateX = mouseY u opsegu [-300, 300] -> [10, -10] stepeni
       rotateY = mouseX u opsegu [-300, 300] -> [-10, 10] stepeni
       perspektiva 1500

     Znak je obrnut kod X: kad je mis nize, kartica se naginje od nas.
     Opseg je 300px od sredista, pa se izvan njega vrijednost odsijeca.

     Dok mis stoji na kartici tranzicija je iskljucena (.is-tilting), da
     nagib prati mis bez kasnjenja. Kad mis izadje, klasa se skida pa se
     kartica vrati u ravan mekano, springom.

     Radi samo na pravom pokazivacu. Na dodir nema hovera, a rotacija bi
     ostala zaglavljena u zadnjem polozaju.
     ------------------------------------------------------------------------ */
  var TILT_RANGE = 300;   /* px od sredista do punog ugla */
  var TILT_MAX   = 10;    /* stepeni */

  function initTilt() {
    var cards = document.querySelectorAll('[data-tilt]');
    if (!cards.length) { return; }
    if (!window.matchMedia('(pointer: fine)').matches) { return; }

    document.documentElement.classList.add('js-tilt');

    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var dx = e.clientX - r.left - r.width / 2;
        var dy = e.clientY - r.top - r.height / 2;

        var clamp = function (v) { return Math.max(-1, Math.min(1, v / TILT_RANGE)); };

        card.classList.add('is-tilting');
        card.style.setProperty('--rx', (-clamp(dy) * TILT_MAX).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ( clamp(dx) * TILT_MAX).toFixed(2) + 'deg');
      });

      card.addEventListener('mouseleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. ČESTA PITANJA
     ------------------------------------------------------------------------
     Markup je vec pravi accordion: pitanje je <button> sa aria-expanded i
     aria-controls, odgovor je panel sa role=region. Tastatura, citaci
     ekrana i fokus rade sami od sebe, skripta samo prebacuje stanje.

     Visina panela se NE pogadja. max-height se mjeri iz stvarne visine
     sadrzaja i upisuje u --h, pa prelaz stane tacno na visini teksta.
     Fiksna vrijednost bi ili odsjekla duzi odgovor ili napravila skok na
     kraju kod kratkog.

     Vise pitanja moze biti otvoreno istovremeno, kao na originalu.
     ------------------------------------------------------------------------ */
  function initFaq() {
    var items = document.querySelectorAll('.faq__item');
    if (!items.length) { return; }

    Array.prototype.forEach.call(items, function (item) {
      var btn = item.querySelector('.faq__btn');
      var panel = item.querySelector('.faq__panel');
      if (!btn || !panel) { return; }

      // hidden je stajao radi stanja bez skripte. Od sada visinu i
      // vidljivost vodi CSS, pa atribut smeta.
      panel.removeAttribute('hidden');

      function measure() {
        var inner = panel.firstElementChild;
        panel.style.setProperty('--h', (inner ? inner.offsetHeight : panel.scrollHeight) + 'px');
      }

      measure();
      panel.classList.toggle('is-open', btn.getAttribute('aria-expanded') === 'true');

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        measure();
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.classList.toggle('is-open', !open);
      });

      window.addEventListener('resize', measure);
    });

    // Font se ucitava naknadno i mijenja visinu odgovora.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        Array.prototype.forEach.call(items, function (item) {
          var panel = item.querySelector('.faq__panel');
          var inner = panel && panel.firstElementChild;
          if (inner) { panel.style.setProperty('--h', inner.offsetHeight + 'px'); }
        });
      });
    }
  }

  /* ------------------------------------------------------------------------
     9. PREGLED FOTOGRAFIJE
     ------------------------------------------------------------------------
     Red u Radovima je obican <a> koji vodi direktno na fajl fotografije.
     Ovdje se taj klik presretne i otvori sloj preko stranice. Bez
     skripte se fotografija prosto otvori u pretrazivacu, sto je i dalje
     ispravno ponasanje, pa nema slijepe tacke.

     Prikazuje se SAMO fotografija, bez naslova i bez opisa.

     Fokus se pri otvaranju premjesta na dugme za zatvaranje, a pri
     zatvaranju vraca na red sa kojeg je krenuo. Bez toga bi korisnik
     tastature poslije zatvaranja zavrsio na vrhu strane.
     ------------------------------------------------------------------------ */
  /* ------------------------------------------------------------------------
     GLOBUS U PODNOZJU
     ------------------------------------------------------------------------
     Trazena je React komponenta na biblioteci cobe (WebGL). Ovaj sajt nema
     nijednu zavisnost, pa je prenesen POKRET i vizuelni jezik, ne kod:
     tackasta kugla koja se polako okrece, istaknuto podrucje rada i tacka
     koja pulsira. Sve na obicnom 2D platnu.

     Tacke dolaze iz js/globus-podaci.js, izvucene iz iste tackaste karte
     koja stoji u kartici "Podrucje rada" na pocetnoj. Nema nove geometrije
     ni novog fajla sa podacima o svijetu.

     Racunica po tacki, jednom pri pokretanju:
       lon, lat  ->  jedinicni vektor (x, y, z)
     pa se po kadru rotira samo oko Y ose i projektuje ortografski. Tacke sa
     z <= 0 su na drugoj strani kugle i preskacu se.

     PODRUCJE RADA je pravougaonik lon 13.3..23.1, lat 41.8..46.9. Namjerno
     nije precizna granica pet drzava: na globusu od 190px cijelo podrucje
     pokriva oko sest tacaka, jer je korak mreze 3.64 stepena po duzini i
     2.66 po sirini. Preciznija granica se na toj velicini ne bi vidjela.
     ------------------------------------------------------------------------ */
  var GLOBUS_OBLAST = { lon1: 13.3, lon2: 23.1, lat1: 41.8, lat2: 46.9 };
  var GLOBUS_KISAC = { lon: 19.7203, lat: 45.3306 };

  /* ------------------------------------------------------------------------
     UCITAVANJE
     ------------------------------------------------------------------------
     Sloj se sklanja kad strana stvarno stigne (window load), ali ne prije
     nego sto je stajao NAJMANJE 350ms. Bez tog minimuma na brzoj vezi samo
     bljesne, sto izgleda kao greska u iscrtavanju, ne kao ucitavanje.

     Gornja granica je 5s: ako se neka slika zaglavi, sadrzaj se svejedno
     otkriva. Iza toga stoji jos i cisto CSS-na kocnica na 6s, za slucaj da
     ova skripta uopste ne stigne da se izvrsi.
     ------------------------------------------------------------------------ */
  var PRELOADER_MIN = 350;
  var PRELOADER_MAX = 5000;

  window.BSTEEL_RESPLIT = window.BSTEEL_RESPLIT || {};

  window.BSTEEL_RESPLIT.fill = function (el, text) {
    el.textContent = text;
    // Ako efekat nije upaljen (smanjena animacija), ostaje obican tekst.
    if (document.documentElement.classList.contains('js-scroll-fill')) { fillJedan(el); }
  };

  function initPreloader() {
    var el = document.getElementById('preloader');
    if (!el) { return; }

    var pocetak = Date.now();
    var gotovo = false;

    function skloni() {
      if (gotovo) { return; }
      gotovo = true;
      el.classList.add('is-done');
      // Sklanja se iz stabla poslije prelaza, da ne ostane kao mrtav sloj.
      window.setTimeout(function () {
        if (el.parentNode) { el.parentNode.removeChild(el); }
      }, 600);
    }

    function zavrsi() {
      var proteklo = Date.now() - pocetak;
      window.setTimeout(skloni, Math.max(0, PRELOADER_MIN - proteklo));
    }

    if (document.readyState === 'complete') {
      zavrsi();
    } else {
      window.addEventListener('load', zavrsi);
    }

    window.setTimeout(skloni, PRELOADER_MAX);
  }

  function initGlobus() {
    var host = document.querySelector('[data-globus]');
    if (!host || !window.BSTEEL_GLOBUS) { return; }

    var canvas = host.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    var P = window.BSTEEL_GLOBUS;
    var raspon = P.latMax - P.latMin;

    // Priprema: iz mrezne pozicije u jedinicni vektor. Racuna se JEDNOM.
    /* PROREDJIVANJE KA POLOVIMA.
       Izvorna karta je pravougaona mreza sa ravnomjernim korakom po duzini.
       Na kugli se svi meridijani skupljaju ka polu, pa je prvi render imao
       gustu traku preko sjevernog pola, kao ozbiljak. Gustina po povrsini
       raste kao 1 / cos(lat), pa se zadrzava svaka n-ta tacka u redu, gdje
       je n upravo taj odnos. Oko ekvatora se ne mijenja nista, a Grenland i
       sjever Kanade se prorijede taman toliko da se citaju kao kopno. */
    var tacke = [];
    for (var i = 0; i < P.t.length; i += 2) {
      var kolona = Math.round((P.t[i] / 2) - 0.5);
      var lon = (P.t[i] / 2) / P.w * 360 - 180;
      var lat = P.latMax - (P.t[i + 1] / 100) / P.h * raspon;

      var korak = Math.max(1, Math.round(1 / Math.max(0.08, Math.cos(lat * Math.PI / 180))));
      if (kolona % korak !== 0) { continue; }

      tacke.push(uVektor(lon, lat, unutar(lon, lat)));
    }
    var kisac = uVektor(GLOBUS_KISAC.lon, GLOBUS_KISAC.lat, true);

    function unutar(lon, lat) {
      return lon >= GLOBUS_OBLAST.lon1 && lon <= GLOBUS_OBLAST.lon2 &&
             lat >= GLOBUS_OBLAST.lat1 && lat <= GLOBUS_OBLAST.lat2;
    }

    function uVektor(lon, lat, istaknuta) {
      var fi = lon * Math.PI / 180;
      var te = lat * Math.PI / 180;
      var cosT = Math.cos(te);
      return {
        x: cosT * Math.sin(fi),
        y: Math.sin(te),
        z: cosT * Math.cos(fi),
        n: istaknuta
      };
    }

    /* Nagib ose, da se sjeverna hemisfera vidi odozgo kao na globusu na
       stolu. Isti ugao koji trazena komponenta koristi za theta. */
    var NAGIB = 0.28;
    var sinN = Math.sin(NAGIB), cosN = Math.cos(NAGIB);

    // Boje se citaju iz CSS-a, da globus prati paletu bez druge liste boja.
    var stil = getComputedStyle(document.documentElement);
    /* --stone-500 a ne --stone-600: na crnom podnozju je #7B725E na pola
       prozirnosti davao jedva vidljivo kopno, kontinenti se nisu citali. */
    var bojaMirna = (stil.getPropertyValue('--stone-500') || '#BAB3A2').trim();
    var bojaJaka = (stil.getPropertyValue('--sand-300') || '#FAE1A6').trim();

    var w = 0, h = 0, r = 0, cx = 0, cy = 0;

    function razmjeri() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = w;
      if (!w) { return false; }
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      r = w * 0.46;
      cx = w / 2;
      cy = h / 2;
      return true;
    }

    var faza = 0;
    /* Pocetni ugao okrece Kisac ka gledaocu, da se podrucje rada vidi prvo,
       a ne da se ceka pola obrta. */
    faza = -GLOBUS_KISAC.lon * Math.PI / 180;

    function crtaj() {
      ctx.clearRect(0, 0, w, h);

      var sinF = Math.sin(faza), cosF = Math.cos(faza);

      // Kugla ispod tacaka, da rub bude citljiv i kad je kopno na drugoj strani.
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (var i = 0; i < tacke.length; i++) {
        var t = tacke[i];

        // rotacija oko Y ose
        var x1 = t.x * cosF + t.z * sinF;
        var z1 = -t.x * sinF + t.z * cosF;
        // nagib oko X ose
        var y2 = t.y * cosN - z1 * sinN;
        var z2 = t.y * sinN + z1 * cosN;

        if (z2 <= 0.02) { continue; }   // druga strana kugle

        // Tacke pri rubu su blize horizontu, pa blijede i smanjuju se.
        var dubina = z2;
        ctx.globalAlpha = t.n ? Math.min(1, 0.55 + dubina * 0.65)
                              : 0.26 + dubina * 0.46;
        ctx.fillStyle = t.n ? bojaJaka : bojaMirna;
        var vel = (t.n ? 1.6 : 1.15) * (0.6 + dubina * 0.4);
        ctx.beginPath();
        ctx.arc(cx + x1 * r, cy - y2 * r, vel, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tacka koja pulsira nad Kisacem, samo dok je na vidljivoj strani.
      var kx = kisac.x * cosF + kisac.z * sinF;
      var kz1 = -kisac.x * sinF + kisac.z * cosF;
      var ky = kisac.y * cosN - kz1 * sinN;
      var kz = kisac.y * sinN + kz1 * cosN;

      if (kz > 0.02) {
        var px = cx + kx * r, py = cy - ky * r;
        var t0 = (Date.now() % 2200) / 2200;          // 2.2s, kao u originalu
        var prsten = 3 + t0 * 12;
        ctx.globalAlpha = (1 - t0) * 0.55 * Math.min(1, kz * 2);
        ctx.strokeStyle = bojaJaka;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, prsten, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = Math.min(1, kz * 2);
        ctx.fillStyle = bojaJaka;
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    var radi = false, vidljiv = false;

    function kadar() {
      if (!radi) { return; }
      faza += 0.0022;
      crtaj();
      window.requestAnimationFrame(kadar);
    }

    function pali(na) {
      if (na === radi) { return; }
      radi = na;
      if (na) { window.requestAnimationFrame(kadar); }
    }

    if (!razmjeri()) { return; }
    host.classList.add('is-ready');

    /* Ne vrti se dok se ne vidi. Podnozje je na dnu svake strane, pa bi
       inace platno trosilo kadrove kroz citav skrol. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (unosi) {
        vidljiv = unosi[0].isIntersecting;
        pali(vidljiv && !document.hidden);
      }, { threshold: 0.05 }).observe(host);
    } else {
      vidljiv = true;
      pali(true);
    }

    document.addEventListener('visibilitychange', function () {
      pali(vidljiv && !document.hidden);
    });

    window.addEventListener('resize', function () {
      if (razmjeri()) { crtaj(); }
    });

    /* Smanjena animacija: kugla se iscrta jednom, sa Kisacem okrenutim ka
       gledaocu, i tu ostaje. Podatak se i dalje vidi, pokreta nema. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      crtaj();
      return;
    }

    crtaj();
  }

  function initLightbox() {
    var box = document.getElementById('lightbox');
    if (!box) { return; }

    var img = box.querySelector('.lightbox__img');
    var closeBtn = box.querySelector('.lightbox__close');
    var lastFocus = null;

    function open(src, alt) {
      lastFocus = document.activeElement;
      img.setAttribute('src', src);
      img.setAttribute('alt', alt || '');
      box.removeAttribute('hidden');

      // Sljedeci kadar, da prelaz prozirnosti ima od cega da krene.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { box.classList.add('is-open'); });
      });

      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';

      window.setTimeout(function () {
        box.setAttribute('hidden', '');
        img.setAttribute('src', '');
      }, 320);

      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-lightbox]');
      if (!link) { return; }
      e.preventDefault();

      var hidden = link.querySelector('.visually-hidden');
      open(link.getAttribute('href'), hidden ? hidden.textContent : '');
    });

    closeBtn.addEventListener('click', close);

    // Klik na podlogu zatvara, klik na samu fotografiju ne.
    box.addEventListener('click', function (e) {
      if (e.target === box) { close(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hasAttribute('hidden')) { close(); }
    });
  }

  initPreloader();
  initHeaderOnScroll();
  initCvalsSlider();
  initGlobus();
  initLocMap();
  initWorksSlider();
  initCountUp();
  initFaq();
  initLightbox();

  if (!reduceMotion.matches) { initCardFlip(); }

  if (!reduceMotion.matches) {
    initHeroParallax();
    initScrollFill();
    initCardStack();
    initProcessRail();
    initTilt();
    initMission();
    initCoreValues();
  }

  var finePointer = window.matchMedia('(pointer: fine)');
  if (finePointer.matches && !reduceMotion.matches) {
    initSmoothScroll();
  }

})();


/* ==========================================================================
   PREOSTALE KUKE ZA KASNIJE

   COUNT-UP BROJACI
     Markup:  .stat__value.js-count  sa  data-count-to="42"
     Atribut je za sad prazan jer brojke nisu potvrdjene. Kada klijent
     dostavi vrijednosti: upisi broj, zamijeni [DOPUNITI: X], pa animiraj
     od 0 istom krivom (--ease-strux, 0.6s).

   FORMA
     Rijeseno na drugi nacin 02.09.2026: i pocetna i kontakt.html nose
     wizard iz js/wizard.js, a #upit-forma i #forma-status vise ne postoje.
     Ostaje samo da se u wizard.js upise ENDPOINT sa Apps Scripta.

   MAPA
     .map-slot  -> zamijeni Google Maps iframe-om. Odnos stranica je zadat
     u CSS-u pa layout nece skociti.

   KARUSEL
     Strux ima strelice na uslugama i testimonijalima. Za to je dovoljan
     scroll-snap plus dva dugmeta sa scrollBy, bez biblioteke.
   ========================================================================== */
