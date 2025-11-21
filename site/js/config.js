window.cfg = {
  ga4: { enabled: false, id: '' },
  pixel: { enabled: false, id: '' }
}

if (window.cfg.ga4.enabled && window.cfg.ga4.id) {
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${window.cfg.ga4.id}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  function gtag(){ dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date()); gtag('config', window.cfg.ga4.id)
}

if (window.cfg.pixel.enabled && window.cfg.pixel.id) {
  !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', window.cfg.pixel.id)
}
