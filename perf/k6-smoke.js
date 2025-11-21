import http from 'k6/http'
import { check, sleep, group } from 'k6'

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01']
  }
}

const base = __ENV.BASE_URL || 'http://localhost:8000'

export default function () {
  group('pages', () => {
    const res1 = http.get(`${base}/`)
    check(res1, { 'index 200': (r) => r.status === 200 })

    const res2 = http.get(`${base}/catalog.html`)
    check(res2, { 'catalog 200': (r) => r.status === 200 })

    const res3 = http.get(`${base}/product.html?id=p1`)
    check(res3, { 'product 200': (r) => r.status === 200 })
  })

  group('assets', () => {
    const res4 = http.get(`${base}/assets/products.json`)
    check(res4, { 'products 200': (r) => r.status === 200 })

    const res5 = http.get(`${base}/styles.css`)
    const res6 = http.get(`${base}/js/app.js`)
    check(res5, { 'css 200': (r) => r.status === 200 })
    check(res6, { 'app 200': (r) => r.status === 200 })
  })

  sleep(1)
}