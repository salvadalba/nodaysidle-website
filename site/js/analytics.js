const analytics = {
  events: JSON.parse(localStorage.getItem('ndi_events') || '[]'),
  track(type, payload) {
    const e = { type, payload, ts: Date.now() }
    this.events.push(e)
    localStorage.setItem('ndi_events', JSON.stringify(this.events))
    if (window.gtag && window.cfg?.ga4?.enabled) {
      window.gtag('event', type, payload || {})
    }
    if (window.fbq && window.cfg?.pixel?.enabled) {
      if (type === 'add_to_cart') window.fbq('track', 'AddToCart', payload || {})
      if (type === 'purchase') window.fbq('track', 'Purchase', payload || {})
    }
  }
}
