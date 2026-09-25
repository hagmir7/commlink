import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const TODAY = dayjs().startOf('day')

export const toDayjsOrNull = (v) => {
  if (!v) return null

  const d = dayjs(v)

  return d.isValid() ? d : null
}
