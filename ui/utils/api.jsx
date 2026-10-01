import axios from 'axios'

const DEFAULT_COMPANY = 'intercocina'

const getAuthToken = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('authToken') || ''
  }
  return ''
}

const getCompany = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('company') || DEFAULT_COMPANY
  }
  return DEFAULT_COMPANY
}

let baseURL = localStorage.getItem('connection_url') || 'https://localhost:7244'
export const BASE_URL = baseURL
export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const company = getCompany()
  config.headers['X-Company'] = company

  return config
})
