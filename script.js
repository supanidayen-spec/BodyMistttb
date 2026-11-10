/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + กรองตาม mood   (#filter-bar, #product-list)
   - order.html   : เติมฟอร์มจาก URL + ส่งออเดอร์ (#orderForm, #customerName,
                    #contact, #items, #total, #note)
   - admin.html   : แสดงออเดอร์จาก Google Sheet  (#ordersTable tbody)
   แต่ละส่วนทำงานเฉพาะเมื่อพบ element ของหน้านั้นๆ
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Config
     ------------------------------------------------------------------------ */
  var PRODUCTS_URL = 'products.json';

  var ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbzjH83tF-VdehHVwY_H7NQCvk2beY_G3gOE18eYdyxrBxYIGI6vaL6UwDt_dDiE03sO/exec';

  var ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFjPLhFR3ZdH1zjlUSzBHhte8HXpUU7m3PiU5nLfap_g8BYj5xqwOISdb9BTSETsDv81CuNI-eW2N9/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  var TYPE_LABELS = {
    spray: 'น้ำหอมฉีดตัว',
    rollon: 'โรลออน'
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(value) {
    var n = Number(value);
    if (isNaN(n)) return String(value);
    return n.toLocaleString('th-TH');
  }

  function getMoodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  function isValidMood(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return true;
    }
    return false;
  }

  /* ========================================================================
     1) product.html — โหลดสินค้า + กรอง mood
     ======================================================================== */
  function initProductPage() {
    var list = document.getElementById('product-list');
    var filterBar = document.getElementById('filter-bar');
    if (!list || !filterBar) return;

    var products = [];
    var currentMood = 'all';

    function buildOrderUrl(product) {
      // ชื่อสินค้าที่ส่งไปหน้าสั่งซื้อ = ชื่อ + ไซส์ (ถ้ามี)
      var itemName = product.size ? product.name + ' ' + product.size : product.name;
      return (
        'order.html?item=' + encodeURIComponent(itemName) +
        '&price=' + encodeURIComponent(product.price)
      );
    }

    function createCard(product) {
      var card = el('article', 'product-card');
      card.setAttribute('data-mood', product.mood);

      // รูป
      var media = el('div', 'product-card__media');
      var img = document.createElement('img');
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      media.appendChild(img);
      card.appendChild(media);

      // เนื้อหา
      var body = el('div', 'product-card__body');

      body.appendChild(el('span', 'mood-tag product-card__mood', getMoodLabel(product.mood)));
      body.appendChild(el('h3', 'product-card__title', product.name));
      body.appendChild(
        el('p', 'product-card__meta', product.size ? product.size : TYPE_LABELS[product.type] || '')
      );

      // ราคา + ปุ่มสั่งซื้อ
      var footer = el('div', 'product-card__footer');

      var price = el('span', 'price', formatPrice(product.price));
      price.appendChild(el('small', null, 'บาท'));
      footer.appendChild(price);

      var orderLink = el('a', 'btn btn--accent', 'สั่งซื้อ');
      orderLink.href = buildOrderUrl(product);
      footer.appendChild(orderLink);

      body.appendChild(footer);
      card.appendChild(body);

      return card;
    }

    function render() {
      list.innerHTML = '';

      var visible = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (!visible.length) {
        list.appendChild(el('p', 'text-soft', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }

      visible.forEach(function (p) {
        list.appendChild(createCard(p));
      });
    }

    function updateButtons() {
      var buttons = filterBar.querySelectorAll('.filter__btn');
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.getAttribute('data-mood-filter') === currentMood;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function setMood(key, updateUrl) {
      currentMood = isValidMood(key) ? key : 'all';
      updateButtons();
      render();

      // ให้ URL ตรงกับตัวกรองปัจจุบัน (แชร์ลิงก์ได้) โดยไม่โหลดหน้าใหม่
      if (updateUrl && window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        if (currentMood === 'all') {
          url.searchParams.delete('mood');
        } else {
          url.searchParams.set('mood', currentMood);
        }
        window.history.replaceState(null, '', url.toString());
      }
    }

    function buildFilterBar() {
      filterBar.innerHTML = '';
      filterBar.classList.add('filter');

      MOODS.forEach(function (m) {
        var btn = el('button', 'filter__btn');
        btn.type = 'button';
        btn.setAttribute('data-mood-filter', m.key);

        if (m.key !== 'all') {
          btn.setAttribute('data-mood', m.key);
          btn.appendChild(el('span', 'mood-dot'));
        }
        btn.appendChild(document.createTextNode(m.label));

        btn.addEventListener('click', function () {
          setMood(m.key, true);
        });

        filterBar.appendChild(btn);
      });
    }

    buildFilterBar();
    list.appendChild(el('p', 'text-soft', 'กำลังโหลดสินค้า...'));

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        var moodParam = new URLSearchParams(window.location.search).get('mood');
        setMood(moodParam ? moodParam.toLowerCase() : 'all', false);
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = '';
        list.appendChild(el('p', 'text-soft', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง'));
      });
  }

  /* ========================================================================
     2) order.html — เติมฟอร์มจาก URL + ส่งออเดอร์
     ======================================================================== */
  function initOrderPage() {
    var form = document.getElementById('orderForm');
    if (!form) return;

    var itemsInput = document.getElementById('items');
    var totalInput = document.getElementById('total');

    // เติม items และ total จาก URL parameter ทันทีที่โหลดหน้า
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (itemsInput && item) {
      itemsInput.value = item;
    }
    if (totalInput && price) {
      totalInput.value = price;
    }

    function getValue(id) {
      var node = document.getElementById(id);
      return node ? node.value.trim() : '';
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (form.reportValidity && !form.reportValidity()) return;

      var payload = {
        customerName: getValue('customerName'),
        contact: getValue('contact'),
        items: getValue('items'),
        total: getValue('total'),
        note: getValue('note')
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ========================================================================
     3) admin.html — แสดงออเดอร์จาก Google Sheet (CSV)
     ======================================================================== */

  /**
   * parse CSV ตามมาตรฐาน RFC 4180 แบบย่อ
   * รองรับ: ข้อความในเครื่องหมายคำพูด, comma/ขึ้นบรรทัดใหม่ภายในช่อง,
   * "" แทน " ภายในช่อง, ท้ายบรรทัดแบบ \n / \r\n
   */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    // ตัด BOM ถ้ามี
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"'; // "" -> "
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }

    // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง
    return rows.filter(function (r) {
      return r.some(function (cell) {
        return cell.trim() !== '';
      });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    var COLUMN_COUNT = 6;

    function showMessage(message) {
      tbody.innerHTML = '';
      var tr = document.createElement('tr');
      var td = el('td', 'text-soft', message);
      td.colSpan = COLUMN_COUNT;
      td.style.textAlign = 'center';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (csv) {
        var rows = parseCSV(csv);

        // แถวแรกคือหัวคอลัมน์ ข้ามไป
        var dataRows = rows.slice(1);

        if (!dataRows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        // ออเดอร์ถูกเพิ่มต่อท้ายชีตตามลำดับเวลา จึงกลับลำดับให้ล่าสุดขึ้นก่อน
        dataRows.reverse();

        tbody.innerHTML = '';
        dataRows.forEach(function (r) {
          var tr = document.createElement('tr');
          // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
          for (var c = 0; c < COLUMN_COUNT; c++) {
            tr.appendChild(el('td', null, r[c] !== undefined ? r[c] : ''));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง');
      });
  }

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
