import {submit} from 'email-utils/utils.js';

(function(){
  if (!window.addEventListener || !document.documentElement.setAttribute || !document.querySelector || !document.documentElement.classList || !window.localStorage) {
    return
  }

  var options = INSTALL_OPTIONS;
  var isPreview = INSTALL_ID == 'preview';

  var optionsString = JSON.stringify(options);
  if (!isPreview && localStorage.leadLineShownWithOptions === optionsString) {
    return;
  }

  var setOptions = function(opts) {
    options = opts;

    update();
  };

  var update = function() {
    document.documentElement.setAttribute('cfapps-lead-line-goal', options.goal);

    updateColors();
    updateCopy();

    setPageStyles();
  };

  var colorStyle = document.createElement('style');
  document.head.appendChild(colorStyle);

  var updateColors = function() {
    colorStyle.innerHTML = '' +
      '.cfapps-lead-line {' +
        'background: ' + options.color + ' !important' +
      '}' +
      '.cfapps-lead-line .cfapps-lead-line-button {' +
        'color: ' + options.color + ' !important' +
      '}' +
    '';
  };

  var el = document.createElement('cfapps-lead-line');
  el.addEventListener('touchstart', function(){}, false); // iOS :hover CSS hack
  el.className = 'cfapps-lead-line';

  var updateCopy = function() {
    el.innerHTML = '' +
      '<div class="cfapps-lead-line-close-button"></div>' +
      '<div class="cfapps-lead-line-content">' +
        '<div class="cfapps-lead-line-text"></div>' +
        (options.goal === 'announcement' ? '' :
        '<' + (options.goal === 'signup' ? 'form' : 'div') + ' class="cfapps-lead-line-form">' +
          (options.goal !== 'signup' ? '' :
          '<input name="email" class="cfapps-lead-line-input" type="email" placeholder="'+ options.signupInputPlaceholder + '" spellcheck="false" required>') +
          (options.goal === 'cta' ?
          '<a target="_blank" class="cfapps-lead-line-link">' : '') +
            '<button ' + (options.goal === 'signup' ? 'type="submit" ' : '') + 'class="cfapps-lead-line-button"></button>' +
          (options.goal === 'cta' ?
          '</a>' : '') +
        '</' + (options.goal === 'signup' ? 'form' : 'div') + '>') +
      '</div>' +
      '<div class="cfapps-lead-line-branding">' +
        '<a class="cfapps-lead-line-branding-link" href="https://www.cloudflare.com/apps?utm_source=lead_line_powered_by_link" target="_blank">Powered by Cloudflare Apps</a>' +
      '</div>' +
    '';

    var textEl = el.querySelector('.cfapps-lead-line-text')
    textEl.innerHTML = options[options.goal + 'Text'];

    var buttonEl = el.querySelector('.cfapps-lead-line-button')
    if (options.goal !== 'announcement') {
      buttonEl.innerHTML = options[options.goal + 'ButtonText'] || '&nbsp;';
    } else if (buttonEl) {
      buttonEl.innerHTML = '';
    }

    var linkEl;
    if (options.goal === 'cta') {
      linkEl = el.querySelector('.cfapps-lead-line-link')
      linkEl.setAttribute('href', options.ctaLinkAddress);
    }

    el.querySelector('.cfapps-lead-line-close-button').addEventListener('click', hide);
    if (options.goal == 'cta') {
      linkEl.addEventListener('click', hide);
    }
  }

  el.addEventListener('submit', function(event) {
    event.preventDefault();

    var form = el.querySelector('form');
    var button = el.querySelector('button[type="submit"]');

    if (isPreview) {
      el.querySelector('.cfapps-lead-line-text').innerHTML = options.signupSuccessText + ' (Form submissions are simulated during the Cloudflare Apps preview.)';
      document.documentElement.setAttribute('cfapps-lead-line-goal', 'announcement');
      setPageStyles();
      return;
    }

    var callback = function(ok) {
      var message;

      button.removeAttribute('disabled');

      if (ok){
        document.documentElement.setAttribute('cfapps-lead-line-goal', 'announcement');
        setPageStyles();

        if (typeof ok == 'string'){
          message = ok;
        } else {
          message = options.signupSuccessText;
        }

        form.parentNode.removeChild(form);
        setTimeout(hide, 3000);
      } else {
        message = 'Whoops, something didn’t work. Please try again:';
      }

      el.querySelector('.cfapps-lead-line-text').innerHTML = message;
      setPageStyles();
    };

    var email = el.querySelector('input[type="email"]').value;

    options.destination = options.signupDestination;
    options.email = options.signupEmail;
    submit(options, email, callback);

    button.setAttribute('disabled', 'disabled');
  });

  var htmlStyle = document.createElement('style');
  document.head.appendChild(htmlStyle);

  var show = function() {
    document.documentElement.setAttribute('cfapps-lead-line-show', 'true');

    if (!htmlStyle.parentNode){
      document.head.appendChild(htmlStyle);
    }
  };
  show();

  var isShown = function() {
    return document.documentElement.getAttribute('cfapps-lead-line-show') === 'true';
  };

  var hide = function() {
    document.documentElement.setAttribute('cfapps-lead-line-show', 'false');
    document.head.removeChild(htmlStyle);
    try {
      localStorage.leadLineShownWithOptions = optionsString;
    } catch (e) {}
    setPageStyles();
  };

  var setPageStyles = function() {
    setHTMlStyle();
    setFixedElementStyles();
  };

  var documentElementOriginallyPositionStatic = getComputedStyle(document.documentElement).position === 'static';
  var setHTMlStyle  = function() {
    if (!document.body) return;

    var style = '';
    if (documentElementOriginallyPositionStatic && isShown()) {
      var positionStyle = '';
      style = '' +
        'html {' +
          'position: relative;' +
          'top: ' + el.clientHeight + 'px' +
        '}' +
      '';
    }
    htmlStyle.innerHTML = style;
  };

  var setFixedElementStyles = function() {
    var removeTopStyle = function(node) {
      if (!node.getAttribute('style')) return;
      node.setAttribute('style', node.getAttribute('style').replace(/top[^;]+;?/g, ''));
    };

    // Cache this to minimize potential repaints
    var elHeight = el.clientHeight;

    // Find fixed position nodes to adjust
    var allNodes = document.querySelectorAll('*:not(.cfapps-lead-line):not([data-cfapps-lead-line-adjusted-fixed-element-original-top])');
    Array.prototype.forEach.call(allNodes, function(node) {
      var computedStyle = getComputedStyle(node);
      var boundingClientRect = node.getBoundingClientRect();

      var isSticky = computedStyle.position === 'sticky';
      var isFixed = computedStyle.position === 'fixed';
      var isBottomFixed = computedStyle.bottom === '0px' && boundingClientRect.bottom === window.innerHeight && boundingClientRect.top >= elHeight;

      if ((isFixed || isSticky) && !isBottomFixed) {
        var top = boundingClientRect.top;
        var styleTop = parseInt(computedStyle.top, 10);
        if (isSticky || (top === styleTop && top <= elHeight)) {
          node.setAttribute('data-cfapps-lead-line-adjusted-fixed-element-original-top', top);
        }
      }
    });

    // Adjust them
    var adjustedNodes = document.querySelectorAll('[data-cfapps-lead-line-adjusted-fixed-element-original-top]');
    Array.prototype.forEach.call(adjustedNodes, function(node) {
      removeTopStyle(node);
      var computedStyle = getComputedStyle(node);
      var isFixedOrSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky';
      if (isFixedOrSticky && isShown() && elHeight > 0) {
        var newTop = (parseInt(computedStyle.top, 10) || 0) + elHeight;
        node.style.top = newTop + 'px';
      }
    });
  };

  window.addEventListener('resize', setPageStyles);

  document.addEventListener('DOMContentLoaded', function(){
    document.body.appendChild(el);

    update();

    setTimeout(setPageStyles, 0);
  });

  window.LeadLine = {
    setOptions: setOptions,
    show: show,
    hide: hide
  };
})();
