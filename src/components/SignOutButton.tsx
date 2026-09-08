'use client'

import { signOutVisitor } from '@/actions/signOutVisitor'
import { t } from '@/lib/copy'

export function SignOutButton() {
  return (
    <form action={signOutVisitor}>
      <button type="submit" className="text-sm underline opacity-80">
        {t('login.signOut')}
      </button>
    </form>
  )
}
