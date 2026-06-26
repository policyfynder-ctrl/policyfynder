import { getMyProfile } from '@/services/portal'
import { getMyPreferences } from '@/services/preferences'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ProfileForm } from '@/components/features/portal/ProfileForm'
import { ChangePasswordForm } from '@/components/features/portal/ChangePasswordForm'
import { CommunicationPreferences } from '@/components/features/portal/CommunicationPreferences'

export const metadata = { title: 'Profile — PolicyFynder' }

export default async function ProfilePage() {
  const [profile, prefs] = await Promise.all([getMyProfile(), getMyPreferences()])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal & contact details</CardTitle>
          <CardDescription>Update your name and phone number.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            fullName={profile?.full_name ?? ''}
            phone={profile?.phone ?? ''}
            email={profile?.email ?? ''}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <CommunicationPreferences prefs={prefs} />
    </div>
  )
}
