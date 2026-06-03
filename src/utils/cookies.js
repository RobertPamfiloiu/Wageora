export const trackActivity = (action) => {
  try {
    const key  = 'wageora_activity'
    const prev = JSON.parse(getCookie(key) || '[]')
    const entry = { action, time: new Date().toISOString() }
    const next  = [...prev.slice(-49), entry]
    setCookie(key, JSON.stringify(next), 30)
  } catch { /* silent */ }
}

export const getActivityLog = () => {
  try { return JSON.parse(getCookie('wageora_activity') || '[]') }
  catch { return [] }
}

export const trackPreference = (key, value) => {
  setCookie(`wageora_pref_${key}`, value, 365)
}

export const getPreference = (key, fallback = null) => {
  return getCookie(`wageora_pref_${key}`) || fallback
}

const setCookie = (name, value, days) => {
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

const getCookie = (name) => {
  const key = name + '='
  const decoded = decodeURIComponent(document.cookie)
  for (const part of decoded.split(';')) {
    const p = part.trimStart()
    if (p.startsWith(key)) return p.slice(key.length)
  }
  return null
}
