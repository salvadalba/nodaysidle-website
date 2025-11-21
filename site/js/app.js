const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('ndi_cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('ndi_wishlist') || '[]'),
  saved: JSON.parse(localStorage.getItem('ndi_saved') || '[]'),
  coupon: localStorage.getItem('ndi_coupon') || '',
  users: JSON.parse(localStorage.getItem('ndi_users') || '[]'),
  session: localStorage.getItem('ndi_session') || '',
  tagFilter: [],
  catalogFiltered: [],
  catalogRendered: 0,
  pageSize: 6
}

function saveCart() {
  localStorage.setItem('ndi_cart', JSON.stringify(state.cart))
}

function saveWishlist() {
  localStorage.setItem('ndi_wishlist', JSON.stringify(state.wishlist))
}

function saveSaved() {
  localStorage.setItem('ndi_saved', JSON.stringify(state.saved))
}

async function loadProducts() {
  const override = localStorage.getItem('ndi_products_override')
  if (override) {
    try { state.products = JSON.parse(override) } catch { state.products = [] }
  } else {
    const res = await fetch('/assets/products.json')
    const data = await res.json()
    state.products = data
  }
}

function addToCart(id) {
  const item = state.cart.find(i => i.id === id)
  if (item) {
    item.qty += 1
  } else {
    const p = state.products.find(p => p.id === id)
    if (!p) return
    state.cart.push({ id: p.id, title: p.title, price: p.price, currency: p.currency, image: p.image, qty: 1 })
  }
  saveCart()
  renderCartBadge()
  if (typeof analytics !== 'undefined') analytics.track('add_to_cart', { id })
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id)
  saveCart()
  renderCart()
  renderCartBadge()
}

function saveForLater(id) {
  const item = state.cart.find(i => i.id === id)
  if (!item) return
  state.saved.push(item)
  state.cart = state.cart.filter(i => i.id !== id)
  saveCart()
  saveSaved()
  renderCart()
  renderCartBadge()
}

function moveToCart(id) {
  const item = state.saved.find(i => i.id === id)
  if (!item) return
  const existing = state.cart.find(i => i.id === id)
  if (existing) existing.qty += item.qty
  else state.cart.push(item)
  state.saved = state.saved.filter(i => i.id !== id)
  saveCart()
  saveSaved()
  renderCart()
  renderCartBadge()
}

function updateQty(id, qty) {
  const item = state.cart.find(i => i.id === id)
  if (!item) return
  item.qty = Math.max(1, qty)
  saveCart()
  renderCart()
  renderCartBadge()
}

function addToWishlist(id) {
  const u = state.users.find(x => x.id === state.session)
  if (u) {
    if (!u.wishlist.includes(id)) u.wishlist.push(id)
    saveUsers()
  } else {
    if (!state.wishlist.includes(id)) state.wishlist.push(id)
    saveWishlist()
  }
  renderWishlistButtons()
  if (typeof analytics !== 'undefined') analytics.track('add_to_wishlist', { id })
}

function removeFromWishlist(id) {
  const u = state.users.find(x => x.id === state.session)
  if (u) {
    u.wishlist = u.wishlist.filter(x => x !== id)
    saveUsers()
  } else {
    state.wishlist = state.wishlist.filter(x => x !== id)
    saveWishlist()
  }
  renderWishlistButtons()
}

function totals() {
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal > 300 ? 0 : (subtotal > 0 ? 7.5 : 0)
  const tax = subtotal * 0.22
  const discount = state.coupon === 'NDI10' ? subtotal * 0.10 : 0
  const total = subtotal - discount + shipping + tax
  return { subtotal, shipping, tax, discount, total }
}

function format(amount) {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(amount)
}

function saveUsers() { localStorage.setItem('ndi_users', JSON.stringify(state.users)) }
function setSession(id) { state.session = id; localStorage.setItem('ndi_session', id) }
function currentUser() { return state.users.find(u => u.id === state.session) || null }

async function hash(text) {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  const arr = Array.from(new Uint8Array(buf))
  return arr.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function registerUser(email, password, name) {
  email = (email || '').trim().toLowerCase()
  if (!email || !password) throw new Error('Email and password required')
  if (state.users.some(u => u.email === email)) throw new Error('Email already registered')
  const pw = await hash(password)
  const id = 'u_' + Math.random().toString(36).slice(2, 10)
  const user = { id, email, passwordHash: pw, name: name || '', roles: [], addresses: [], wishlist: [], orders: [] }
  const hasAdmin = state.users.some(u => (u.roles || []).includes('admin'))
  if (!hasAdmin) user.roles.push('admin')
  state.users.push(user)
  saveUsers()
  setSession(id)
  return user
}

async function loginUser(email, password) {
  email = (email || '').trim().toLowerCase()
  const pw = await hash(password)
  const user = state.users.find(u => u.email === email && u.passwordHash === pw)
  if (!user) throw new Error('Invalid credentials')
  setSession(user.id)
  return user
}

function logoutUser() { setSession('') }

function getReviews(productId) {
  const all = JSON.parse(localStorage.getItem('ndi_reviews') || '{}')
  return all[productId] || []
}

function saveReviews(productId, reviews) {
  const all = JSON.parse(localStorage.getItem('ndi_reviews') || '{}')
  all[productId] = reviews
  localStorage.setItem('ndi_reviews', JSON.stringify(all))
}

function renderReviews(productId) {
  const box = document.querySelector('.reviews-list')
  if (!box) return
  const items = getReviews(productId).filter(r => r.status === 'approved')
  if (items.length === 0) { box.innerHTML = '<div class="muted">No reviews yet.</div>'; return }
  const avg = (items.reduce((s,r)=>s+r.rating,0)/items.length).toFixed(1)
  box.innerHTML = `<div class="muted">Average rating: ${avg} (${items.length} reviews)</div>` +
    items.map(r => `
      <div class="review neo-inset">
        <div><strong>${r.rating}★</strong> by ${r.userEmail} on ${new Date(r.date).toLocaleDateString()}</div>
        <div>${r.title ? `<em>${r.title}</em>` : ''}</div>
        <div>${r.body}</div>
      </div>
    `).join('')
}

function renderReviewForm(productId) {
  const form = document.querySelector('.reviews-form')
  const u = currentUser()
  if (!form) return
  if (!u) { form.innerHTML = '<div class="muted">Please <a class="link" href="/login.html">sign in</a> to leave a review.</div>'; return }
  form.innerHTML = `
    <div class="form-grid">
      <select class="select" id="rating">
        <option value="5">5</option>
        <option value="4">4</option>
        <option value="3">3</option>
        <option value="2">2</option>
        <option value="1">1</option>
      </select>
      <input class="input" id="title" placeholder="Title (optional)" />
      <textarea class="input" id="body" placeholder="Your review" rows="4"></textarea>
    </div>
    <div class="actions"><button class="btn-primary" id="submit-review">Submit Review</button></div>
  `
  document.getElementById('submit-review').addEventListener('click', () => {
    const rating = parseInt(document.getElementById('rating').value,10)
    const title = document.getElementById('title').value
    const body = document.getElementById('body').value
    const items = getReviews(productId)
    items.push({ userId: u.id, userEmail: u.email, rating, title, body, date: Date.now(), status: 'pending' })
    saveReviews(productId, items)
    renderReviews(productId)
    form.innerHTML = '<div class="muted">Thanks! Your review is pending moderation.</div>'
  })
}

window.state = state
window.currentUser = currentUser
window.saveUsers = saveUsers
window.getReviews = getReviews
window.saveReviews = saveReviews

function initLogin() {
  const btn = document.getElementById('login')
  if (!btn) return
  btn.addEventListener('click', async () => {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    try { await loginUser(email, password); location.href = '/account.html' } catch (e) { alert(e.message) }
  })
}

function initRegister() {
  const btn = document.getElementById('register')
  if (!btn) return
  btn.addEventListener('click', async () => {
    const name = document.getElementById('name').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    try { await registerUser(email, password, name); location.href = '/account.html' } catch (e) { alert(e.message) }
  })
}

function initAccount() {
  const u = currentUser()
  const box = document.querySelector('.account')
  if (!box) return
  if (!u) { box.innerHTML = '<div class="muted">Not signed in. <a class="link" href="/login.html">Sign in</a> or <a class="link" href="/register.html">Create account</a>.</div>'; return }
  box.innerHTML = `
    <div class="account-grid">
      <div class="neo-inset card">
        <h2>Profile</h2>
        <div><strong>Name:</strong> ${u.name || '—'}</div>
        <div><strong>Email:</strong> ${u.email}</div>
        <div class="actions"><button class="btn-secondary" id="logout">Sign out</button></div>
      </div>
      <div class="neo-inset card">
        <h2>Addresses</h2>
        <div class="addresses"></div>
        <div class="form-grid">
          <input class="input" id="a_line1" placeholder="Address line"/>
          <input class="input" id="a_city" placeholder="City"/>
          <input class="input" id="a_postal" placeholder="Postal"/>
          <input class="input" id="a_country" placeholder="Country"/>
        </div>
        <div class="actions"><button class="btn-primary" id="add-address">Add Address</button></div>
      </div>
      <div class="neo-raised card">
        <h2>Orders</h2>
        <div class="orders"></div>
      </div>
    </div>
  `
  document.getElementById('logout').addEventListener('click', () => { logoutUser(); location.href = '/index.html' })
  const addBtn = document.getElementById('add-address')
  addBtn.addEventListener('click', () => {
    const line1 = document.getElementById('a_line1').value
    const city = document.getElementById('a_city').value
    const postal = document.getElementById('a_postal').value
    const country = document.getElementById('a_country').value
    u.addresses.push({ line1, city, postal, country })
    saveUsers(); renderAccountLists()
  })
  renderAccountLists()
}

function renderAccountLists() {
  const u = currentUser(); if (!u) return
  const addr = document.querySelector('.addresses')
  if (addr) addr.innerHTML = u.addresses.length ? u.addresses.map(a => `<div>${a.line1}, ${a.city} ${a.postal}, ${a.country}</div>`).join('') : '<div class="muted">No addresses</div>'
  const orders = document.querySelector('.orders')
  if (orders) orders.innerHTML = u.orders.length ? u.orders.map(o => `<div>Order ${o.id} — ${format(o.totals.total)} — ${new Date(o.date).toLocaleDateString()}</div>`).join('') : '<div class="muted">No orders</div>'
}

function initForgot() {
  const btn = document.getElementById('reset')
  if (!btn) return
  btn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim().toLowerCase()
    const pass = document.getElementById('password').value
    const u = state.users.find(x => x.email === email)
    if (!u) { alert('Email not found'); return }
    u.passwordHash = await hash(pass)
    saveUsers(); alert('Password updated'); location.href = '/login.html'
  })
}

let catalogObserver
function renderCatalog() {
  const grid = document.querySelector('.product-grid')
  if (!grid) return
  grid.innerHTML = ''
  const q = (document.getElementById('q')?.value || '').toLowerCase()
  const cat = document.getElementById('cat')?.value || ''
  const min = parseFloat(document.getElementById('min')?.value || '0') || 0
  const max = parseFloat(document.getElementById('max')?.value || '0') || 0
  const tags = state.tagFilter
  const list = state.products.filter(p => {
    const inCat = !cat || p.category === cat
    const text = [p.title, p.description, ...(p.tags||[])].join(' ').toLowerCase()
    const matches = !q || text.includes(q)
    const inPrice = (!min || p.price >= min) && (!max || p.price <= max)
    const inTags = tags.length === 0 || (p.tags||[]).some(t => tags.includes(t))
    return inCat && matches && inPrice && inTags
  })
  state.catalogFiltered = list
  state.catalogRendered = 0

  function appendPage() {
    const start = state.catalogRendered
    const end = Math.min(start + state.pageSize, state.catalogFiltered.length)
    for (let i = start; i < end; i++) {
      const p = state.catalogFiltered[i]
      const card = document.createElement('div')
      card.className = 'product-card'
      card.innerHTML = `
        <div class="product-media">
          <img src="${p.image}" alt="${p.title}" class="product-image" loading="lazy" width="800" height="220"/>
        </div>
        <div class="product-body">
          <h3 class="product-title">${p.title}</h3>
          <div class="product-meta">
            <span class="price">${format(p.price)}</span>
            <span class="stock">${p.stock > 0 ? 'In stock' : 'Out of stock'}</span>
          </div>
          <div class="product-actions">
            <a href="/product.html?id=${p.id}" class="btn-secondary">View</a>
            <button class="btn-secondary add-to-cart" data-id="${p.id}">Add to Cart</button>
          </div>
        </div>
      `
      grid.appendChild(card)
    }
    state.catalogRendered = end
    grid.querySelectorAll('.add-to-cart').forEach(b => b.addEventListener('click', e => addToCart(e.currentTarget.getAttribute('data-id'))))
    renderCartBadge()
  }

  appendPage()

  const sentinel = document.createElement('div')
  sentinel.className = 'catalog-sentinel'
  sentinel.style.minHeight = '1px'
  grid.appendChild(sentinel)
  if (catalogObserver) { try { catalogObserver.disconnect() } catch {} }
  catalogObserver = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      if (state.catalogRendered < state.catalogFiltered.length) appendPage()
    }
  })
  catalogObserver.observe(sentinel)
}

function renderCartBadge() {
  const el = document.querySelector('.cart-badge')
  if (!el) return
  const count = state.cart.reduce((s, i) => s + i.qty, 0)
  el.textContent = count > 0 ? String(count) : ''
}

function renderCart() {
  const list = document.querySelector('.cart-list')
  const sum = document.querySelector('.cart-totals')
  if (!list || !sum) return
  list.innerHTML = ''
  state.cart.forEach(i => {
    const row = document.createElement('div')
    row.className = 'cart-row'
    row.innerHTML = `
      <img src="${i.image}" alt="${i.title}" class="cart-thumb"/>
      <div class="cart-title">${i.title}</div>
      <div class="cart-controls">
        <input type="number" min="1" value="${i.qty}" data-id="${i.id}" class="qty"/>
        <button class="btn-secondary save" data-id="${i.id}">Save for later</button>
        <button class="btn-secondary remove" data-id="${i.id}">Remove</button>
      </div>
      <div class="cart-price">${format(i.price * i.qty)}</div>
    `
    list.appendChild(row)
  })
  list.querySelectorAll('.qty').forEach(inp => inp.addEventListener('change', e => updateQty(e.currentTarget.getAttribute('data-id'), parseInt(e.currentTarget.value, 10) || 1)))
  list.querySelectorAll('.save').forEach(btn => btn.addEventListener('click', e => saveForLater(e.currentTarget.getAttribute('data-id'))))
  list.querySelectorAll('.remove').forEach(btn => btn.addEventListener('click', e => removeFromCart(e.currentTarget.getAttribute('data-id'))))
  const t = totals()
  sum.innerHTML = `
    <div>Subtotal: <strong>${format(t.subtotal)}</strong></div>
    <div>Discount: <strong>${format(t.discount)}</strong></div>
    <div>Shipping: <strong>${format(t.shipping)}</strong></div>
    <div>Tax (22%): <strong>${format(t.tax)}</strong></div>
    <div>Total: <strong>${format(t.total)}</strong></div>
    <div class="coupon">
      <input class="input" id="coupon" placeholder="Discount code" value="${state.coupon}"/>
      <button class="btn-secondary" id="apply-coupon">Apply</button>
    </div>
    <div class="actions"><a href="/checkout.html" class="btn-primary">Checkout</a></div>
  `
  const apply = document.getElementById('apply-coupon')
  const inp = document.getElementById('coupon')
  apply.addEventListener('click', () => {
    state.coupon = (inp.value || '').trim().toUpperCase()
    localStorage.setItem('ndi_coupon', state.coupon)
    renderCart()
  })
  const savedBox = document.querySelector('.saved-list')
  if (savedBox) {
    savedBox.innerHTML = ''
    state.saved.forEach(i => {
      const row = document.createElement('div')
      row.className = 'cart-row'
      row.innerHTML = `
        <img src="${i.image}" alt="${i.title}" class="cart-thumb"/>
        <div class="cart-title">${i.title}</div>
        <div class="cart-controls">
          <button class="btn-primary move" data-id="${i.id}">Move to cart</button>
          <button class="btn-secondary remove-saved" data-id="${i.id}">Remove</button>
        </div>
        <div class="cart-price">${format(i.price * i.qty)}</div>
      `
      savedBox.appendChild(row)
    })
    savedBox.querySelectorAll('.move').forEach(btn => btn.addEventListener('click', e => moveToCart(e.currentTarget.getAttribute('data-id'))))
    savedBox.querySelectorAll('.remove-saved').forEach(btn => btn.addEventListener('click', e => {
      state.saved = state.saved.filter(x => x.id !== e.currentTarget.getAttribute('data-id'))
      saveSaved()
      renderCart()
    }))
  }
  renderCartBadge()
}

function renderWishlistButtons() {
  const u = state.users.find(x => x.id === state.session)
  const list = u ? u.wishlist : state.wishlist
  document.querySelectorAll('.wishlist').forEach(b => {
    const id = b.getAttribute('data-id')
    b.textContent = list.includes(id) ? 'Wishlisted' : 'Wishlist'
  })
}

async function initCatalog() {
  await loadProducts()
  renderCatalog()
  const q = document.getElementById('q')
  const cat = document.getElementById('cat')
  const min = document.getElementById('min')
  const max = document.getElementById('max')
  const minR = document.getElementById('minRange')
  const maxR = document.getElementById('maxRange')
  if (q) q.addEventListener('input', renderCatalog)
  if (cat) cat.addEventListener('change', renderCatalog)
  if (min) min.addEventListener('input', renderCatalog)
  if (max) max.addEventListener('input', renderCatalog)
  const prices = state.products.map(p=>p.price)
  const cap = Math.max(500, Math.ceil(Math.max(...prices)/50)*50)
  if (minR && maxR) {
    minR.min = '0'; maxR.min = '0'; minR.max = String(cap); maxR.max = String(cap)
    minR.value = '0'; maxR.value = String(cap)
    minR.addEventListener('input', () => { min.value = minR.value; renderCatalog(); updateFiltersUrl() })
    maxR.addEventListener('input', () => { max.value = maxR.value; renderCatalog(); updateFiltersUrl() })
  }
  const tags = Array.from(new Set(state.products.flatMap(p => p.tags || [])))
  const chipsBox = document.getElementById('tag-chips')
  if (chipsBox) {
    chipsBox.innerHTML = ''
    tags.forEach(t => {
      const chip = document.createElement('button')
      chip.className = 'chip'
      chip.textContent = t
      chip.addEventListener('click', () => {
        const i = state.tagFilter.indexOf(t)
        if (i >= 0) {
          state.tagFilter.splice(i,1)
        } else {
          state.tagFilter.push(t)
        }
        chip.classList.toggle('selected')
        renderCatalog(); updateFiltersUrl()
      })
      chipsBox.appendChild(chip)
    })
  }
  const params = new URLSearchParams(location.search)
  if (q && params.get('q')) q.value = params.get('q')
  if (cat && params.get('cat')) cat.value = params.get('cat')
  if (min && params.get('min')) min.value = params.get('min')
  if (max && params.get('max')) max.value = params.get('max')
  const tParam = params.get('tags'); if (tParam) { state.tagFilter = tParam.split(',').filter(Boolean); document.querySelectorAll('#tag-chips .chip').forEach(c => { if (state.tagFilter.includes(c.textContent)) c.classList.add('selected') }) }
  renderCatalog(); updateFiltersUrl()
}

function updateFiltersUrl() {
  const q = document.getElementById('q')?.value || ''
  const cat = document.getElementById('cat')?.value || ''
  const min = document.getElementById('min')?.value || ''
  const max = document.getElementById('max')?.value || ''
  const tags = state.tagFilter.join(',')
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (cat) params.set('cat', cat)
  if (min) params.set('min', min)
  if (max) params.set('max', max)
  if (tags) params.set('tags', tags)
  history.replaceState({}, '', `${location.pathname}?${params.toString()}`)
  localStorage.setItem('ndi_catalog_filters', params.toString())
}

async function initProduct() {
  await loadProducts()
  const params = new URLSearchParams(location.search)
  const id = params.get('id')
  const p = state.products.find(x => x.id === id)
  if (!p) return
  const root = document.querySelector('.product-detail')
  const revs = getReviews(p.id)
  const avg = revs.length ? (revs.reduce((s,r)=>s+r.rating,0)/revs.length).toFixed(1) : null
  const stars = avg ? '★'.repeat(Math.round(avg)) : ''
  root.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-media"><img src="${p.image}" alt="${p.title}" class="product-image" loading="lazy" width="800" height="400"/></div>
      <div class="product-info">
        <h1>${p.title}</h1>
        <div class="lead">${p.description}</div>
        <div class="price">${format(p.price)}</div>
        <div class="rating-bar">${avg ? `<span class="stars">${stars}</span><span class="muted">${avg} (${revs.length})</span>` : `<span class="muted">No reviews yet</span>`}</div>
        <ul class="checks">${p.specs.map(s => `<li>${s}</li>`).join('')}</ul>
        <div class="actions">
          <button class="btn-secondary add" data-id="${p.id}">Add to Cart</button>
        </div>
        <div class="stock">${p.stock > 0 ? 'In stock' : 'Out of stock'}</div>
      </div>
    </div>
    <section class="reviews">
      <h2>Customer Reviews</h2>
      <div class="reviews-list"></div>
      <div class="reviews-form"></div>
    </section>
  `
  document.querySelector('.add').addEventListener('click', e => addToCart(e.currentTarget.getAttribute('data-id')))
  
  renderCartBadge()
  renderReviews(p.id)
  renderReviewForm(p.id)
  if (typeof analytics !== 'undefined') analytics.track('view_item', { id: p.id, price: p.price })
  const crumb = document.getElementById('crumb-product')
  if (crumb) crumb.textContent = p.title
  const ogTitle = document.querySelector('meta[property="og:title"]')
  const ogDesc = document.querySelector('meta[property="og:description"]')
  const ogImage = document.querySelector('meta[property="og:image"]')
  if (ogTitle) ogTitle.setAttribute('content', p.title)
  if (ogDesc) ogDesc.setAttribute('content', p.description)
  if (ogImage) ogImage.setAttribute('content', p.image)
  const bc = {
    '@context':'https://schema.org', '@type':'BreadcrumbList',
    itemListElement:[
      { '@type':'ListItem', position:1, name:'Home', item:'https://nodaysidle.com/' },
      { '@type':'ListItem', position:2, name:'Store', item:'https://nodaysidle.com/catalog.html' },
      { '@type':'ListItem', position:3, name:p.title, item:'https://nodaysidle.com/product.html?id='+p.id }
    ]
  }
  const bcScript = document.createElement('script')
  bcScript.type = 'application/ld+json'
  bcScript.textContent = JSON.stringify(bc)
  document.head.appendChild(bcScript)
  const saved = localStorage.getItem('ndi_catalog_filters')
  const storeLink = document.getElementById('crumb-store')
  if (saved && storeLink) storeLink.href = '/catalog.html?' + saved
  const ld = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.title,
    image: [p.image],
    description: p.description,
    sku: p.id,
    brand: { '@type': 'Brand', name: 'NODAYSIDLE' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
    offers: {
      '@type': 'Offer',
      priceCurrency: p.currency,
      price: p.price,
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  }
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(ld)
  document.head.appendChild(script)
}

function initCart() {
  renderCart()
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.getAttribute('data-page')
  if (page === 'catalog') initCatalog()
  if (page === 'product') initProduct()
  if (page === 'cart') initCart()
  if (page === 'checkout') initCheckout()
  if (page === 'login') initLogin()
  if (page === 'register') initRegister()
  if (page === 'account') initAccount()
  if (page === 'forgot') initForgot()
  if (page === 'blog') initBlog()
  renderCartBadge()
  const toggle = document.getElementById('terminal-toggle')
  const body = document.body
  if (localStorage.getItem('ndi-mode') === 'terminal') { body.classList.add('term-active'); if (toggle) toggle.checked = true }
  if (toggle) toggle.addEventListener('change', function() {
    if (this.checked) { body.classList.add('term-active'); localStorage.setItem('ndi-mode','terminal') }
    else { body.classList.remove('term-active'); localStorage.setItem('ndi-mode','gui') }
  })
})

function totalsWith(method) {
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = method === 'express' ? (subtotal > 0 ? 14.5 : 0) : (subtotal > 0 ? 7.5 : 0)
  const tax = subtotal * 0.22
  const total = subtotal + shipping + tax
  return { subtotal, shipping, tax, total }
}

function initCheckout() {
  const sum = document.querySelector('.summary')
  const select = document.getElementById('shipping')
  const btn = document.getElementById('place-order')
  function render() {
    const t = totalsWith(select.value)
    sum.innerHTML = `
      <div>Items: <strong>${state.cart.reduce((s,i)=>s+i.qty,0)}</strong></div>
      <div>Subtotal: <strong>${format(t.subtotal)}</strong></div>
      <div>Shipping: <strong>${format(t.shipping)}</strong></div>
      <div>Tax (22%): <strong>${format(t.tax)}</strong></div>
      <div>Total: <strong>${format(t.total)}</strong></div>
    `
  }
  select.addEventListener('change', render)
  btn.addEventListener('click', () => {
    const u = state.users.find(x => x.id === state.session)
    if (!u) { alert('Please register to place an order'); location.href = '/register.html'; return }
    if (typeof analytics !== 'undefined') analytics.track('begin_checkout', { items: state.cart.map(i => ({ id: i.id, qty: i.qty })) })
    const id = 'o_' + Math.random().toString(36).slice(2,10)
    const t = totalsWith(select.value)
    u.orders = u.orders || []
    u.orders.push({ id, items: state.cart, totals: t, date: Date.now() })
    saveUsers()
    alert('Order placed. Confirmation will be sent by email.')
    localStorage.setItem('ndi_last_order_total', JSON.stringify(t))
    if (typeof analytics !== 'undefined') analytics.track('purchase', { id, total: t.total })
  })
  render()
}

async function initBlog() {
  const list = document.querySelector('.blog-list')
  if (!list) return
  try {
    const base = '/wp/wp-json/wp/v2/posts?per_page=10&_fields=title,link,date'
    const res = await fetch(base)
    const posts = await res.json()
    list.innerHTML = posts.map(p => `
      <li>
        <a class="link" href="${p.link}">${p.title?.rendered || 'Untitled'}</a>
        <span class="muted">${new Date(p.date).toLocaleDateString()}</span>
      </li>
    `).join('')
  } catch {
    list.innerHTML = '<li><span class="muted">Blog feed unavailable.</span></li>'
  }
}

function initWishlist() {
  const list = document.querySelector('.wishlist-list-page')
  const u = currentUser()
  const ids = u ? u.wishlist : state.wishlist
  const items = ids.map(id => state.products.find(p => p.id === id)).filter(Boolean)
  if (!list) return
  list.innerHTML = ''
  items.forEach(p => {
    const row = document.createElement('div')
    row.className = 'wishlist-row'
    row.innerHTML = `
      <img src="${p.image}" alt="${p.title}" class="wishlist-thumb"/>
      <div class="cart-title">${p.title}</div>
      <div class="actions">
        <button class="btn-primary move" data-id="${p.id}">Move to cart</button>
        <button class="btn-secondary remove" data-id="${p.id}">Remove</button>
      </div>
    `
    list.appendChild(row)
  })
  list.querySelectorAll('.move').forEach(b => b.addEventListener('click', e => {
    addToCart(e.currentTarget.getAttribute('data-id'))
    removeFromWishlist(e.currentTarget.getAttribute('data-id'))
    initWishlist()
  }))
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => {
    removeFromWishlist(e.currentTarget.getAttribute('data-id'))
    initWishlist()
  }))
}
