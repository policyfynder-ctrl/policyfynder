'use server'

import { submitContact } from '@/services/contact'

export type ContactState = { error?: string; success?: boolean } | undefined

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export async function contactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const name = String(fd.get('name') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const phone = String(fd.get('phone') ?? '').trim()
  const subject = String(fd.get('subject') ?? '').trim()
  const message = String(fd.get('message') ?? '').trim()

  if (!name) return { error: 'Please enter your name.' }
  if (!isEmail(email)) return { error: 'Please enter a valid email address.' }
  if (message.length < 10) return { error: 'Please enter a message (at least 10 characters).' }

  const res = await submitContact({ name, email, phone, subject, message })
  if (!res.ok) return { error: res.error }
  return { success: true }
}
