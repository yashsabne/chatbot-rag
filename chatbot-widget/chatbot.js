/**
 * RentSmart Chatbot Widget
 * -------------------------------------------------------------------------
 * A dependency-free, embeddable chat widget.
 *
 * Usage (single script tag on any host page):
 *
 *   <script
 *     src="./chatbot.js"
 *     data-api="http://localhost:5007/api/chat"
 *     data-title="RentSmart AI"
 *   ></script>
 *
 * This file ONLY renders UI and talks to the configured API endpoint.
 * It contains no chatbot logic, no API keys, and no hardcoded answers.
 * -------------------------------------------------------------------------
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------
  // 1. Read configuration from the <script> tag that loaded this file
  // -------------------------------------------------------------------

  // document.currentScript is only reliable synchronously, so we grab it
  // immediately at the top of the IIFE.
  var currentScript =
    document.currentScript ||
    (function () {
      // Fallback for older browsers / edge cases: find our own script tag
      // by matching the src filename.
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf('chatbot.js') !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  function getConfig(scriptEl) {
    var dataset = (scriptEl && scriptEl.dataset) || {};

    var apiUrl = dataset.api || '';
    var title = dataset.title || 'AI Assistant';
    var welcomeMessage =
      dataset.welcome || 'Hi! How can I help you today?';
    var placeholder = dataset.placeholder || 'Type your message...';

    // Resolve the CSS file relative to this script's own URL, so the
    // widget keeps working no matter what path/domain it is hosted on.
    var cssHref = '';
    if (scriptEl && scriptEl.src) {
      try {
        cssHref = new URL('./chatbot.css', scriptEl.src).href;
      } catch (e) {
        cssHref = scriptEl.src.replace(/chatbot\.js(\?.*)?$/, 'chatbot.css');
      }
    }
    // Allow an explicit override via data-css if the host needs it.
    if (dataset.css) {
      cssHref = dataset.css;
    }

    return {
      apiUrl: apiUrl,
      title: title,
      welcomeMessage: welcomeMessage,
      placeholder: placeholder,
      cssHref: cssHref,
    };
  }

  var config = getConfig(currentScript);

  if (!config.apiUrl) {
    // eslint-disable-next-line no-console
    console.error(
      '[RentSmart Chatbot] Missing required "data-api" attribute on the ' +
        'chatbot script tag. The widget will not be able to send messages.'
    );
  }

  // -------------------------------------------------------------------
  // 2. Small DOM helper (avoids innerHTML for anything user-controlled)
  // -------------------------------------------------------------------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      if (key === 'class') {
        node.className = attrs[key];
      } else if (key === 'text') {
        node.textContent = attrs[key];
      } else if (key.indexOf('on') === 0 && typeof attrs[key] === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else {
        node.setAttribute(key, attrs[key]);
      }
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  // -------------------------------------------------------------------
  // 3. Build the widget inside an isolated Shadow DOM host
  // -------------------------------------------------------------------

  function initWidget() {
    var host = document.createElement('div');
    host.id = 'rentsmart-chatbot-widget-host';
    document.body.appendChild(host);

    var shadow = host.attachShadow
      ? host.attachShadow({ mode: 'open' })
      : host; // very old browsers: degrade gracefully, no isolation

    var root = el('div', { class: 'rsai-widget' }, []);
    shadow.appendChild(root);

    // Inject the widget's own stylesheet into the shadow root so the
    // host site's CSS cannot affect it, and vice versa.
    if (config.cssHref && shadow.appendChild) {
      var link = el('link', { rel: 'stylesheet', href: config.cssHref });
      shadow.insertBefore(link, root);
    }

    // ---- Floating toggle button -------------------------------------
    var toggleBtn = el('button', {
      class: 'rsai-toggle-btn',
      type: 'button',
      'aria-label': 'Open chat',
      'aria-expanded': 'false',
    });
    toggleBtn.appendChild(buildChatIcon());
    toggleBtn.appendChild(buildCloseIcon('rsai-toggle-close-icon'));

    // ---- Chat window ---------------------------------------------------
    var messagesEl = el('div', {
      class: 'rsai-messages',
      role: 'log',
      'aria-live': 'polite',
    });

    var headerTitle = el('span', { class: 'rsai-header-title', text: config.title });
    var closeBtn = el('button', {
      class: 'rsai-close-btn',
      type: 'button',
      'aria-label': 'Close chat',
    });
    closeBtn.appendChild(buildCloseIcon());

    var header = el('div', { class: 'rsai-header' }, [
      el('div', { class: 'rsai-header-left' }, [
        el('span', { class: 'rsai-status-dot' }),
        headerTitle,
      ]),
      closeBtn,
    ]);

    var textInput = el('input', {
      class: 'rsai-input',
      type: 'text',
      placeholder: config.placeholder,
      autocomplete: 'off',
      'aria-label': 'Message',
    });

    var sendBtn = el('button', {
      class: 'rsai-send-btn',
      type: 'button',
      'aria-label': 'Send message',
    });
    sendBtn.appendChild(buildSendIcon());

    var inputRow = el('div', { class: 'rsai-input-row' }, [textInput, sendBtn]);

    var chatWindow = el('div', {
      class: 'rsai-window',
      role: 'dialog',
      'aria-label': config.title,
    }, [header, messagesEl, inputRow]);

    root.appendChild(chatWindow);
    root.appendChild(toggleBtn);

    // ---- State -----------------------------------------------------
    var isOpen = false;
    var isSending = false;

    function setOpen(open) {
      isOpen = open;
      root.classList.toggle('rsai-open', isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        textInput.focus();
      }
    }

    toggleBtn.addEventListener('click', function () {
      setOpen(!isOpen);
    });
    closeBtn.addEventListener('click', function () {
      setOpen(false);
    });

    // ---- Messages ----------------------------------------------------
    function addMessage(text, sender) {
      // sender: 'user' | 'bot' | 'error'
      var bubble = el('div', {
        class: 'rsai-message rsai-message-' + sender,
        text: text, // textContent only — never innerHTML
      });
      var wrapper = el('div', { class: 'rsai-message-row rsai-row-' + sender }, [
        bubble,
      ]);
      messagesEl.appendChild(wrapper);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return wrapper;
    }

    function showTypingIndicator() {
      var indicator = el('div', { class: 'rsai-message-row rsai-row-bot rsai-typing-row' }, [
        el('div', { class: 'rsai-message rsai-typing' }, [
          el('span', { class: 'rsai-dot' }),
          el('span', { class: 'rsai-dot' }),
          el('span', { class: 'rsai-dot' }),
        ]),
      ]);
      messagesEl.appendChild(indicator);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return indicator;
    }

    // Welcome message on first render.
    if (config.welcomeMessage) {
      addMessage(config.welcomeMessage, 'bot');
    }

    // ---- Sending -----------------------------------------------------
    function setSendingState(sending) {
      isSending = sending;
      textInput.disabled = sending;
      sendBtn.disabled = sending;
      sendBtn.classList.toggle('rsai-disabled', sending);
    }

    function sendMessage() {
      var text = textInput.value.trim();
      if (!text || isSending) {
        return;
      }

      if (!config.apiUrl) {
        addMessage(text, 'user');
        textInput.value = '';
        addMessage(
          'This chatbot is not configured correctly (missing API endpoint).',
          'error'
        );
        return;
      }

      addMessage(text, 'user');
      textInput.value = '';
      setSendingState(true);
      var typingIndicator = showTypingIndicator();

      fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Request failed with status ' + response.status);
          }
          return response.json();
        })
        .then(function (data) {
          typingIndicator.remove();
          if (data && typeof data.answer === 'string' && data.answer.length) {
            addMessage(data.answer, 'bot');
          } else {
            addMessage(
              "Sorry, I didn't get a valid response. Please try again.",
              'error'
            );
          }
        })
        .catch(function () {
          typingIndicator.remove();
          addMessage(
            "Sorry, something went wrong while contacting the assistant. Please try again in a moment.",
            'error'
          );
        })
        .finally(function () {
          setSendingState(false);
          textInput.focus();
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    textInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // -------------------------------------------------------------------
  // 4. Inline icon builders (no external icon library / font dependency)
  // -------------------------------------------------------------------

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function buildChatIcon() {
    var svg = svgEl('svg', {
      class: 'rsai-icon rsai-icon-chat',
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': 'true',
    });
    svg.appendChild(
      svgEl('path', {
        d: 'M4 4h16v12H7l-3 3V4z',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      })
    );
    return svg;
  }

  function buildCloseIcon(extraClass) {
    var svg = svgEl('svg', {
      class: 'rsai-icon rsai-icon-close' + (extraClass ? ' ' + extraClass : ''),
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': 'true',
    });
    svg.appendChild(
      svgEl('path', {
        d: 'M6 6l12 12M18 6L6 18',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
      })
    );
    return svg;
  }

  function buildSendIcon() {
    var svg = svgEl('svg', {
      class: 'rsai-icon rsai-icon-send',
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': 'true',
    });
    svg.appendChild(
      svgEl('path', {
        d: 'M4 12l16-7-6.5 7L20 19 4 12z',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      })
    );
    return svg;
  }

  // -------------------------------------------------------------------
  // 5. Boot
  // -------------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
