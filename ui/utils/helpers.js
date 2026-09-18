export function uppercaseFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const COMPANIES = [
  { value: 1, label: 'Intercocina' },
  { value: 2, label: 'Serie Mobel' },
  { value: 3, label: 'AstiDkor' },
  { value: 4, label: 'Stile Mobili' }
]

export const getCompany = ($id) => {
  const company = COMPANIES.find((c) => c.value === Number($id))
  return company ? company.label : null
}

export const handleShow = async (navigate, path, width = 1400, height = 800) => {
  console.log(window.api)
  // return;
  try {
    if (window.api) {
      await window.api.openShow({ url: path, width, height })
    } else {
      navigate('layout' + path)
    }
  } catch (error) {
    console.error('Error navigating:', error)
  }
}
