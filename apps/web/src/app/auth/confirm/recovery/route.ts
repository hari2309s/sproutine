import { confirmEmailLink } from '@/lib/authConfirm'

/** Password-reset links: always end on the set-new-password page. */
export function GET(request: Request) {
  return confirmEmailLink(request, { recovery: true })
}
