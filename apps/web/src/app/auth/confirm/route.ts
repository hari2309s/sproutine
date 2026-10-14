import { confirmEmailLink } from '@/lib/authConfirm'

export function GET(request: Request) {
  return confirmEmailLink(request)
}
