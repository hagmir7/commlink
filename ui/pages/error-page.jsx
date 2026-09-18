import { useRouteError, Link } from 'react-router-dom'
import { Result, Button } from 'antd'

export default function ErrorPage() {
  const error = useRouteError()
  const status = error?.status === 404 || error?.status === undefined ? 404 : error.status

  return (
    <Result
      status={status === 404 ? '404' : 'error'}
      title={status === 404 ? '404' : 'Something went wrong'}
      subTitle={error?.statusText || error?.message || 'An unexpected error occurred.'}
      extra={
        <Link to="/">
          <Button type="primary">Back Home</Button>
        </Link>
      }
    />
  )
}
